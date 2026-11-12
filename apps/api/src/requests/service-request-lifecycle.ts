import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { PrismaClient } from "../generated/prisma/client.ts";
import { PRISMA } from "../common/constants/prisma-token.ts";
import { AuditSink } from "../common/utils/audit.ts";
import { NotificationsService } from "../notifications/notifications.service.ts";
import { AttachmentsService } from "../attachments/attachments.service.ts";
import { TenantScope } from "../common/utils/tenant-scope.ts";
import { toActor, assignedByActor, officerActor } from "../common/utils/actor.ts";
import { permissionError, canEdit, canDelete, type RequestStatus, type CreateRequestDto, type UpdateRequestDto, type StatusUpdateDto, type AssignDto, type CommentDto } from "@mivacampus/contracts";
import type { TenantContext } from "../common/guards/session.guard.ts";
import { RealtimeService } from "../realtime/realtime.service.ts";
import { loadRequestForAction, assertCanView, scopedRequestLookup } from "./request-access.ts";

async function generateReference(tx: Pick<PrismaClient, "organization">, organizationId: string): Promise<string> {
  const org = await tx.organization.update({
    where: { id: organizationId },
    data: { nextRequestSeq: { increment: 1 } },
    select: { nextRequestSeq: true },
  });
  return `SR-${org.nextRequestSeq - 1}`;
}

const statusLabel = (s: string) => {
  const words = s.replace(/_/g, " ").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

type MemberHolder = { role: string; user: Record<string, unknown> } | null | undefined;

@Injectable()
export class ServiceRequestLifecycleService {
  constructor(
    @Inject(PRISMA) private readonly db: PrismaClient,
    private readonly realtime: RealtimeService,
    private readonly notifications: NotificationsService,
    private readonly attachmentsService: AttachmentsService,
    private readonly auditSink: AuditSink,
  ) {}

  private async memberUserId(memberId: string | null | undefined): Promise<string | null> {
    if (!memberId) return null;
    const member = await this.db.member.findUnique({ where: { id: memberId }, select: { userId: true } });
    return member?.userId ?? null;
  }

  private async assertCategoryInCampus(categoryId: string, organizationId: string, missing: "BadRequest" | "NotFound") {
    const category = await this.db.category.findUnique({ where: { id: categoryId } });
    if (!category) {
      throw missing === "BadRequest"
        ? new BadRequestException("The selected category no longer exists.")
        : new NotFoundException("That category no longer exists.");
    }
    if (category.organizationId && category.organizationId !== organizationId) {
      throw new BadRequestException("That category isn't available for your campus.");
    }
    return category;
  }

  async create(user: { id: string; name: string }, dto: CreateRequestDto, tenant: TenantContext | undefined) {
    const scope = TenantScope.of(tenant);
    const organizationId = scope.requireOrganizationId("You must be in a campus to report a fault.");
    const memberId = scope.requireMemberId("You must be in a campus to report a fault.");

    const category = await this.assertCategoryInCampus(dto.categoryId, organizationId, "BadRequest");

    const request = await this.db.$transaction(async (tx) => {
      const reference = await generateReference(tx, organizationId);
      const created = await tx.serviceRequest.create({
        data: {
          reference,
          title: dto.title,
          description: dto.description,
          location: dto.location,
          priority: dto.priority,
          status: "OPEN",
          categoryId: dto.categoryId,
          creatorId: memberId,
          organizationId,
        },
        include: { category: true },
      });
      await tx.statusLog.create({
        data: { requestId: created.id, memberId, fromStatus: null, toStatus: "OPEN", note: "Request submitted" },
      });
      await this.auditSink.inTx(tx, {
        userId: user.id, memberId, action: "REQUEST_CREATED", entityType: "REQUEST", entityId: created.id,
        details: `${user.name} submitted ${reference} (${category.name})`, organizationId,
      });
      return created;
    });

    await this.notifications.announce(
      {
        title: `New ${dto.priority === "URGENT" ? "URGENT " : ""}request ${request.reference}`,
        message: `${user.name} reported "${dto.title}" at ${dto.location}.`,
        type: dto.priority === "URGENT" ? "WARNING" : "INFO",
        requestId: request.id,
        organizationId,
      },
      { orgAdmins: true },
    );
    await this.notifications.announce(
      {
        title: `Request ${request.reference} submitted`,
        message: "We have received your request. You will be notified when it is assigned and worked on.",
        type: "SUCCESS",
        requestId: request.id,
        organizationId,
      },
      { userIds: [user.id] },
    );

    this.realtime.emit({
      type: "REQUEST_CREATED",
      organizationId,
      requestId: request.id,
      reference: request.reference,
      title: request.title,
      actorId: user.id,
      actorName: user.name,
    });

    return { request };
  }

  async update(user: { id: string; name: string }, id: string, dto: UpdateRequestDto, tenant: TenantContext | undefined) {
    const scope = TenantScope.of(tenant);
    const memberId = scope.memberId;
    const request = await loadRequestForAction(this.db, tenant, id);
    id = request.id;
    const organizationId = scope.organizationId;

    const isOwner = memberId !== null && request.creatorId === memberId;
    if (!canEdit({ role: tenant?.role, id: memberId }, request, request.status as RequestStatus)) {
      throw new ForbiddenException(
        isOwner && request.status !== "OPEN"
          ? "This request is already being processed. Contact the maintenance office to make changes."
          : "You can only edit your own requests.",
      );
    }

    if (dto.categoryId) {
      await this.assertCategoryInCampus(dto.categoryId, scope.requireOrganizationId(), "NotFound");
    }

    const updated = await this.db.$transaction(async (tx) => {
      const saved = await tx.serviceRequest.update({
        where: { id },
        data: {
          ...(dto.title ? { title: dto.title } : {}),
          ...(dto.description ? { description: dto.description } : {}),
          ...(dto.location ? { location: dto.location } : {}),
          ...(dto.priority ? { priority: dto.priority } : {}),
          ...(dto.categoryId ? { categoryId: dto.categoryId } : {}),
        },
      });
      await this.auditSink.inTx(tx, {
        userId: user.id, memberId, action: "REQUEST_UPDATED", entityType: "REQUEST", entityId: id,
        details: `${user.name} updated ${request.reference}`, organizationId,
      });
      return saved;
    });

    return { request: updated };
  }

  async remove(user: { id: string; name: string }, id: string, tenant: TenantContext | undefined) {
    const scope = TenantScope.of(tenant);
    const memberId = scope.memberId;
    const request = await loadRequestForAction(this.db, tenant, id);
    id = request.id;
    const organizationId = scope.organizationId;

    if (!canDelete({ role: tenant?.role, id: memberId }, request, request.status as RequestStatus)) {
      throw new ForbiddenException("You can only delete your own request while it is still OPEN.");
    }

    await this.attachmentsService.deleteObjectsForRequest(id);
    await this.db.$transaction(async (tx) => {
      await tx.serviceRequest.delete({ where: { id } });
      await this.auditSink.inTx(tx, {
        userId: user.id, memberId, action: "REQUEST_DELETED", entityType: "REQUEST", entityId: id,
        details: `${user.name} deleted ${request.reference}`, organizationId,
      });
    });
    return { success: true };
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
      const reqUpdated = await tx.serviceRequest.update({ where: { id }, data: { status: to } });
      await tx.statusLog.create({
        data: { requestId: id, memberId, fromStatus: from, toStatus: to, note: dto.note || null },
      });
      await this.auditSink.inTx(tx, {
        userId: user.id, memberId, action: "REQUEST_STATUS_CHANGED", entityType: "REQUEST", entityId: id,
        details: `${user.name} set ${request.reference}: ${from} → ${to}`, organizationId,
      });
      return reqUpdated;
    });

    const label = statusLabel;
    if (to === "RESOLVED" && tenant?.role === "OFFICER") {
      await this.notifications.announce(
        {
          title: `Request ${request.reference} resolved`,
          message: `${user.name} marked "${request.title}" as resolved. Review and close it.`,
          type: "SUCCESS",
          requestId: id,
          organizationId,
        },
        { orgAdmins: true },
      );
    }
    if (request.creatorId !== memberId) {
      const creatorUserId = await this.memberUserId(request.creatorId);
      if (creatorUserId) {
        await this.notifications.announce(
          {
            title: `Request ${request.reference} is now ${label(to)}`,
            message: `Status changed from ${label(from)} to ${label(to)}.${dto.note ? ` Note: ${dto.note}` : ""}`,
            type: to === "RESOLVED" || to === "CLOSED" ? "SUCCESS" : to === "REJECTED" ? "WARNING" : "STATUS",
            requestId: id,
            organizationId,
          },
          { userIds: [creatorUserId] },
        );
      }
    }
    const activeOfficer = request.assignments[0]?.officerId;
    if (activeOfficer && activeOfficer !== memberId) {
      const officerUserId = await this.memberUserId(activeOfficer);
      if (officerUserId) {
        await this.notifications.announce(
          {
            title: `Request ${request.reference} is now ${label(to)}`,
            message: `Status changed from ${label(from)} to ${label(to)}.`,
            type: "STATUS",
            requestId: id,
            organizationId,
          },
          { userIds: [officerUserId] },
        );
      }
    }
    await this.notifications.announce(
      {
        title: `Request ${request.reference} is now ${label(to)}`,
        message: `Status changed from ${label(from)} to ${label(to)}.${dto.note ? ` Note: ${dto.note}` : ""}`,
        type: "STATUS",
        requestId: id,
        organizationId,
      },
      { userIds: [user.id] },
    );

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
    const creatorUserId = await this.memberUserId(request.creatorId);
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
      officer: toActor(assignment.officer as MemberHolder),
      assignedByUser: toActor(assignment.assignedByUser as MemberHolder),
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

    const creatorUserId = await this.memberUserId(request.creatorId);
    const officerUserId = await this.memberUserId(active.officerId);
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

  async createComment(user: { id: string; name: string }, id: string, dto: CommentDto, tenant: TenantContext | undefined) {
    const scope = TenantScope.of(tenant);
    const memberId = scope.requireMemberId("You must be in a campus to comment.");
    const request = await loadRequestForAction(this.db, tenant, id);
    id = request.id;
    assertCanView(tenant, request);
    const organizationId = scope.organizationId;

    const created = await this.db.comment.create({
      data: { requestId: id, memberId, body: dto.body },
      include: { member: { select: { role: true, user: { select: { id: true, name: true } } } } },
    });
    const comment = {
      ...created,
      user: created.member ? { id: created.member.user.id, name: created.member.user.name, role: created.member.role } : null,
    };

    const notifyUserIds = new Set<string>();
    if (request.creatorId !== memberId) {
      const creatorUserId = await this.memberUserId(request.creatorId);
      if (creatorUserId) notifyUserIds.add(creatorUserId);
    }
    const officerId = request.assignments[0]?.officerId;
    if (officerId && officerId !== memberId) {
      const officerUserId = await this.memberUserId(officerId);
      if (officerUserId) notifyUserIds.add(officerUserId);
    }
    if (notifyUserIds.size) {
      await this.notifications.announce(
        {
          title: `New comment on ${request.reference}`,
          message: `${user.name}: ${dto.body.slice(0, 80)}${dto.body.length > 80 ? "…" : ""}`,
          type: "COMMENT",
          requestId: id,
          organizationId,
        },
        { userIds: [...notifyUserIds] },
      );
    }

    this.realtime.emit({
      type: "REQUEST_COMMENT",
      organizationId: tenant?.organizationId ?? null,
      requestId: id,
      reference: request.reference,
      title: request.title,
      actorId: user.id,
      actorName: user.name,
    });

    return { comment };
  }
}
