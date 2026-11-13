import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { PrismaClient } from "../generated/prisma/client.ts";
import { PRISMA } from "../common/constants/prisma-token.ts";
import { AuditSink } from "../common/utils/audit.ts";
import { NotificationAnnouncer } from "../notifications/notification-announcer.ts";
import { TenantScope } from "../common/utils/tenant-scope.ts";
import { assignedByActor, officerActor, toActor } from "../common/utils/actor.ts";
import type { AssignDto } from "@mivacampus/contracts";
import type { TenantContext } from "../common/guards/session.guard.ts";
import { RealtimeService } from "../realtime/realtime.service.ts";
import { loadRequestForAction, scopedRequestLookup } from "./request-access.ts";
import { memberUserId } from "./request-shared.ts";

@Injectable()
export class AssignmentsService {
  constructor(
    @Inject(PRISMA) private readonly db: PrismaClient,
    private readonly realtime: RealtimeService,
    private readonly notifications: NotificationAnnouncer,
    private readonly auditSink: AuditSink,
  ) {}

  async assign(user: { id: string; name: string }, id: string, dto: AssignDto, tenant: TenantContext | undefined) {
    const scope = TenantScope.of(tenant);
    const organizationId = scope.requireOrganizationId("You must be in a campus to assign requests.");
    const actorMemberId = scope.requireMemberId("You must be in a campus to assign requests.");

    const request = await this.db.serviceRequest.findFirst({ where: scopedRequestLookup(scope, id), include: { category: true } });
    if (!request) throw new NotFoundException("Request not found.");

    if (["CLOSED", "REJECTED"].includes(request.status)) {
      throw new BadRequestException(`Cannot assign a request that is ${request.status}.`);
    }

    const officerMember = await this.db.member.findFirst({
      where: { organizationId, userId: dto.officerId, role: "OFFICER" },
      include: { user: { select: { id: true, name: true, email: true, phone: true, department: true, isActive: true } } },
    });
    if (!officerMember) throw new NotFoundException("Selected officer does not belong to your campus.");
    if (!officerMember.user.isActive) throw new BadRequestException("This officer's account is inactive.");

    const wasOpen = request.status === "OPEN";
    const assignment = await this.db.$transaction(async (tx) => {
      await tx.assignment.updateMany({
        where: { requestId: id, isActive: true },
        data: { isActive: false, releasedAt: new Date() },
      });
      const created = await tx.assignment.create({
        data: { requestId: id, officerId: officerMember.id, assignedById: actorMemberId, note: dto.note || null },
        include: {
          officer: officerActor,
          assignedByUser: assignedByActor,
        },
      });
      if (wasOpen) {
        await tx.serviceRequest.update({ where: { id }, data: { status: "ASSIGNED" } });
        await tx.statusLog.create({
          data: { requestId: id, memberId: actorMemberId, fromStatus: request.status, toStatus: "ASSIGNED", note: `Assigned to ${officerMember.user.name}` },
        });
      }
      await this.auditSink.inTx(tx, {
        userId: user.id, memberId: actorMemberId, action: "REQUEST_ASSIGNED", entityType: "REQUEST", entityId: id,
        details: `${user.name} assigned ${request.reference} to ${officerMember.user.name}`, organizationId,
      });
      return created;
    });

    await this.notifications.announce(
      {
        title: `New assignment: ${request.reference}`,
        message: `You have been assigned "${request.title}" at ${request.location} (${request.priority} priority).`,
        type: "ASSIGNMENT",
        requestId: id,
        organizationId,
      },
      { userIds: [officerMember.user.id] },
    );
    const creatorUserId = await memberUserId(this.db, request.creatorId);
    if (creatorUserId) {
      await this.notifications.announce(
        {
          title: `Request ${request.reference} assigned`,
          message: `Your request has been assigned to ${officerMember.user.name} from the maintenance office.`,
          type: "STATUS",
          requestId: id,
          organizationId,
        },
        { userIds: [creatorUserId] },
      );
    }

    this.realtime.emit({
      type: "REQUEST_ASSIGNED",
      organizationId,
      requestId: id,
      reference: request.reference,
      title: request.title,
      actorId: user.id,
      actorName: user.name,
      detail: `Assigned to ${officerMember.user.name}`,
    });

    const mappedAssignment = {
      ...assignment,
      officer: toActor(assignment.officer),
      assignedByUser: toActor(assignment.assignedByUser),
    };
    return { assignment: mappedAssignment, status: wasOpen ? "ASSIGNED" : request.status };
  }

  async unassign(user: { id: string; name: string }, id: string, tenant: TenantContext | undefined) {
    const scope = TenantScope.of(tenant);
    const organizationId = scope.organizationId;
    const actorMemberId = scope.requireMemberId("You must be in a campus to unassign requests.");
    const request = await loadRequestForAction(this.db, tenant, id);
    id = request.id;

    const active = await this.db.assignment.findFirst({ where: { requestId: id, isActive: true } });
    if (!active) throw new BadRequestException("This request has no active assignment.");

    await this.db.$transaction(async (tx) => {
      await tx.assignment.update({ where: { id: active.id }, data: { isActive: false, releasedAt: new Date() } });
      await tx.serviceRequest.update({ where: { id }, data: { status: "OPEN" } });
      await tx.statusLog.create({
        data: { requestId: id, memberId: actorMemberId, fromStatus: request.status, toStatus: "OPEN", note: "Assignment removed, returned to queue" },
      });
      await this.auditSink.inTx(tx, {
        userId: user.id, memberId: actorMemberId, action: "REQUEST_UNASSIGNED", entityType: "REQUEST", entityId: id,
        details: `${user.name} unassigned ${request.reference}`, organizationId,
      });
    });

    const creatorUserId = await memberUserId(this.db, request.creatorId);
    const officerUserId = await memberUserId(this.db, active.officerId);
    const recipientIds = [...new Set([creatorUserId, officerUserId].filter((x): x is string => Boolean(x)))];
    if (recipientIds.length) {
      await this.notifications.announce(
        {
          title: `Request ${request.reference} re-queued`,
          message: "The assignment on your request was removed. It is back in the open queue.",
          type: "WARNING",
          requestId: id,
          organizationId,
        },
        { userIds: recipientIds },
      );
    }

    this.realtime.emit({
      type: "REQUEST_UNASSIGNED",
      organizationId,
      requestId: id,
      reference: request.reference,
      title: request.title,
      actorId: user.id,
      actorName: user.name,
    });

    return { success: true };
  }
}
