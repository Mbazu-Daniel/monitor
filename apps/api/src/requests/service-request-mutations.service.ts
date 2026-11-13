import {
  ForbiddenException,
  Inject,
  Injectable,
} from "@nestjs/common";
import type { PrismaClient } from "../generated/prisma/client.ts";
import { PRISMA } from "../common/constants/prisma-token.ts";
import { AuditSink } from "../common/utils/audit.ts";
import { NotificationsService } from "../notifications/notifications.service.ts";
import { TenantScope } from "../common/utils/tenant-scope.ts";
import { canEdit, canDelete, type RequestStatus, type CreateRequestDto, type UpdateRequestDto } from "@mivacampus/contracts";
import type { TenantContext } from "../common/guards/session.guard.ts";
import { RealtimeService } from "../realtime/realtime.service.ts";
import { AttachmentsService } from "../attachments/attachments.service.ts";
import { loadRequestForAction } from "./request-access.ts";
import { generateReference, assertCategoryInCampus } from "./request-shared.ts";

@Injectable()
export class RequestMutationsService {
  constructor(
    @Inject(PRISMA) private readonly db: PrismaClient,
    private readonly realtime: RealtimeService,
    private readonly notifications: NotificationsService,
    private readonly attachmentsService: AttachmentsService,
    private readonly auditSink: AuditSink,
  ) {}

  private async loadScopedRequest(tenant: TenantContext | undefined, id: string) {
    const scope = TenantScope.of(tenant);
    const memberId = scope.memberId;
    const request = await loadRequestForAction(this.db, tenant, id);
    return { scope, memberId, request, organizationId: scope.organizationId };
  }

  async create(user: { id: string; name: string }, dto: CreateRequestDto, tenant: TenantContext | undefined) {
    const scope = TenantScope.of(tenant);
    const organizationId = scope.requireOrganizationId("You must be in a campus to report a fault.");
    const memberId = scope.requireMemberId("You must be in a campus to report a fault.");

    const category = await assertCategoryInCampus(this.db, dto.categoryId, organizationId, "BadRequest");

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
    const { scope, memberId, request, organizationId } = await this.loadScopedRequest(tenant, id);
    id = request.id;

    const isOwner = memberId !== null && request.creatorId === memberId;
    if (!canEdit({ role: tenant?.role, id: memberId }, request, request.status as RequestStatus)) {
      throw new ForbiddenException(
        isOwner && request.status !== "OPEN"
          ? "This request is already being processed. Contact the maintenance office to make changes."
          : "You can only edit your own requests.",
      );
    }

    if (dto.categoryId) {
      await assertCategoryInCampus(this.db, dto.categoryId, scope.requireOrganizationId(), "NotFound");
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
    const { memberId, request, organizationId } = await this.loadScopedRequest(tenant, id);
    id = request.id;

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
}
