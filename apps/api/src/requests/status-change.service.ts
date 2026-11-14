import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
} from "@nestjs/common";
import type { PrismaClient, Prisma } from "../generated/prisma/client.ts";
import { PRISMA } from "../common/constants/prisma-token.ts";
import { AuditSink } from "../common/audit/audit.ts";
import { NotificationAnnouncer } from "../notifications/notification-announcer.ts";
import { TenantScope } from "../common/tenancy/tenant-scope.ts";
import { permissionError, type RequestStatus, type StatusUpdateDto } from "@mivacampus/contracts";
import type { TenantContext } from "../common/guards/session.types.ts";
import { RealtimeService } from "../realtime/realtime.service.ts";
import { loadRequestForAction } from "./request-access.ts";
import { memberUserId, statusLabel, statusAnnouncement } from "./request-shared.ts";

@Injectable()
export class StatusChangeService {
  constructor(
    @Inject(PRISMA) private readonly db: PrismaClient,
    private readonly realtime: RealtimeService,
    private readonly notifications: NotificationAnnouncer,
    private readonly auditSink: AuditSink,
  ) {}

  private async fanoutStatusChange(
    tx: Prisma.TransactionClient,
    user: { id: string; name: string },
    request: { reference: string; title: string; creatorId: string; assignments: { officerId: string }[] },
    id: string,
    from: string,
    to: string,
    note: string | undefined,
    memberId: string,
    organizationId: string | null,
    tenantRole: string | null | undefined,
  ) {
    const base = { requestId: id, organizationId };
    if (to === "RESOLVED" && tenantRole === "OFFICER") {
      await this.notifications.announce(
        {
          title: `Request ${request.reference} resolved`,
          message: `${user.name} marked "${request.title}" as resolved. Review and close it.`,
          type: "SUCCESS",
          ...base,
        },
        { orgAdmins: true },
        tx,
      );
    }
    const announcement = statusAnnouncement(request.reference, from, to, note);
    if (request.creatorId !== memberId) {
      const creatorUserId = await memberUserId(tx, request.creatorId);
      if (creatorUserId) {
        await this.notifications.announce({ ...announcement, ...base }, { userIds: [creatorUserId] }, tx);
      }
    }
    const activeOfficer = request.assignments[0]?.officerId;
    if (activeOfficer && activeOfficer !== memberId) {
      const officerUserId = await memberUserId(tx, activeOfficer);
      if (officerUserId) {
        await this.notifications.announce(
          {
            title: announcement.title,
            message: `Status changed from ${statusLabel(from)} to ${statusLabel(to)}.`,
            type: "STATUS",
            ...base,
          },
          { userIds: [officerUserId] },
          tx,
        );
      }
    }
    await this.notifications.announce(
      { title: announcement.title, message: announcement.message, type: "STATUS", ...base },
      { userIds: [user.id] },
      tx,
    );
  }

  async changeStatus(user: { id: string; name: string }, id: string, dto: StatusUpdateDto, tenant: TenantContext | undefined) {
    const scope = TenantScope.of(tenant);
    const organizationId = scope.organizationId;
    const memberId = scope.requireMemberId("You must be in a campus to change a request's status.");
    const request = await loadRequestForAction(this.db, tenant, id);
    id = request.id;

    const from = request.status;
    const to = dto.status;
    if (from === to) throw new BadRequestException(`Request is already ${to}.`);

    const isAssignedOfficer = request.assignments.some((a) => a.officerId === memberId);
    const isCreator = request.creatorId === memberId;

    const permissionDenied = permissionError({ role: tenant?.role, isAssignedOfficer, isCreator }, from as RequestStatus, to as RequestStatus);
    if (permissionDenied) throw new ForbiddenException(permissionDenied);

    const updated = await this.db.$transaction(async (tx) => {
      const touched = await tx.serviceRequest.updateMany({ where: { id, status: from }, data: { status: to } });
      if (touched.count === 0) {
        throw new ConflictException("This request changed while you were working on it. Reload it and try again.");
      }
      await tx.statusLog.create({
        data: { requestId: id, memberId, fromStatus: from, toStatus: to, note: dto.note || null },
      });
      await this.auditSink.inTx(tx, {
        userId: user.id, memberId, action: "REQUEST_STATUS_CHANGED", entityType: "REQUEST", entityId: id,
        details: `${user.name} set ${request.reference}: ${from} → ${to}`, organizationId,
      });
      await this.fanoutStatusChange(tx, user, request, id, from, to, dto.note, memberId, organizationId, tenant?.role);
      const { assignments: _assignments, ...base } = request;
      return { ...base, status: to, updatedAt: new Date() };
    });

    this.realtime.emit({
      type: "REQUEST_STATUS_CHANGED",
      organizationId,
      requestId: id,
      reference: request.reference,
      title: request.title,
      actorId: user.id,
      actorName: user.name,
      detail: `${from} → ${to}`,
    });

    return { request: updated };
  }
}
