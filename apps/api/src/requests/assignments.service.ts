import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { conflictIfUnique } from "../common/db-errors.ts";
import type { PrismaClient } from "../generated/prisma/client.ts";
import { PRISMA } from "../common/constants/prisma-token.ts";
import { AuditSink } from "../common/audit/audit.ts";
import { NotificationAnnouncer } from "../notifications/notification-announcer.ts";
import { TenantScope } from "../common/tenancy/tenant-scope.ts";
import { assignedByActor, officerActor, toActor } from "../common/actor.ts";
import type { AssignDto } from "@mivacampus/contracts";
import type { TenantContext } from "../common/guards/session.types.ts";
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

    let outcomeStatus = request.status;
    const assignment = await this.db.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<{ id: string; status: string }[]>`SELECT "id", "status" FROM "service_request" WHERE "id" = ${id} FOR UPDATE`;
      const currentStatus = locked[0]?.status;
      if (!currentStatus) throw new NotFoundException("Request not found.");
      if (["CLOSED", "REJECTED"].includes(currentStatus)) {
        throw new BadRequestException(`Cannot assign a request that is ${currentStatus}.`);
      }
      outcomeStatus = currentStatus === "OPEN" ? "ASSIGNED" : currentStatus;
      await tx.assignment.updateMany({
        where: { requestId: id, isActive: true },
        data: { isActive: false, releasedAt: new Date() },
      });
      const created = await conflictIfUnique(
        tx.assignment.create({
          data: { requestId: id, officerId: officerMember.id, assignedById: actorMemberId, note: dto.note || null },
          include: {
            officer: officerActor,
            assignedByUser: assignedByActor,
          },
        }),
        "This request already has an active assignee. Reload and try again.",
      );
      if (currentStatus === "OPEN") {
        await tx.serviceRequest.update({ where: { id }, data: { status: "ASSIGNED" } });
        await tx.statusLog.create({
          data: { requestId: id, memberId: actorMemberId, fromStatus: currentStatus, toStatus: "ASSIGNED", note: `Assigned to ${officerMember.user.name}` },
        });
      }
      await this.auditSink.inTx(tx, {
        userId: user.id, memberId: actorMemberId, action: "REQUEST_ASSIGNED", entityType: "REQUEST", entityId: id,
        details: `${user.name} assigned ${request.reference} to ${officerMember.user.name}`, organizationId,
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
        tx,
      );
      const creatorUserId = await memberUserId(tx, request.creatorId);
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
          tx,
        );
      }
      return created;
    });

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
    return { assignment: mappedAssignment, status: outcomeStatus };
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
      const returned = await tx.serviceRequest.updateMany({
        where: { id, status: { in: ["ASSIGNED", "IN_PROGRESS", "ON_HOLD"] } },
        data: { status: "OPEN" },
      });
      if (returned.count === 0) {
        throw new ConflictException("Only active work can be returned to the queue.");
      }
      await tx.assignment.update({ where: { id: active.id }, data: { isActive: false, releasedAt: new Date() } });
      await tx.statusLog.create({
        data: { requestId: id, memberId: actorMemberId, fromStatus: request.status, toStatus: "OPEN", note: "Assignment removed, returned to queue" },
      });
      await this.auditSink.inTx(tx, {
        userId: user.id, memberId: actorMemberId, action: "REQUEST_UNASSIGNED", entityType: "REQUEST", entityId: id,
        details: `${user.name} unassigned ${request.reference}`, organizationId,
      });
      const creatorUserId = await memberUserId(tx, request.creatorId);
      const officerUserId = await memberUserId(tx, active.officerId);
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
          tx,
        );
      }
    });

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
