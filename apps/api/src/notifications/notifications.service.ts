import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma, PrismaClient } from "../generated/prisma/client.ts";
import { PRISMA } from "../common/constants/prisma-token.ts";
import { logger } from "../common/logger.ts";
import { parsePagination } from "../common/utils/pagination.ts";
import type { NotificationType } from "@mivacampus/contracts";
import type { TenantContext } from "../common/guards/session.guard.ts";
import type { ListQuery } from "../common/dto/list-query.dto.ts";

export interface AnnounceInput {
  title: string;
  message: string;
  type: NotificationType;
  requestId?: string | null;
  organizationId: string | null;
}

export interface AnnounceAudience {
  userIds?: string[];
  orgAdmins?: boolean;
}

@Injectable()
export class NotificationsService {
  constructor(@Inject(PRISMA) private readonly db: PrismaClient) {}
  async announce(input: AnnounceInput, audience: AnnounceAudience, tx?: Prisma.TransactionClient) {
    const db = tx ?? this.db;
    const requestedIds = [...new Set(audience.userIds ?? [])];

    if (input.organizationId) {
      let members: { id: string }[] = [];
      if (audience.orgAdmins) {
        members = await db.member.findMany({
          where: { organizationId: input.organizationId, role: "ADMIN", user: { isActive: true } },
          select: { id: true },
        });
      } else if (requestedIds.length) {
        members = await db.member.findMany({
          where: { organizationId: input.organizationId, userId: { in: requestedIds }, user: { isActive: true } },
          select: { id: true },
        });
        if (members.length !== requestedIds.length) {
          logger.warn({ organizationId: input.organizationId, requested: requestedIds.length, delivered: members.length }, "[NOTIFY_PARTIAL] some recipients have no active membership in the campus");
        }
      }
      if (members.length === 0) {
        if (audience.orgAdmins || requestedIds.length > 0) {
          logger.warn({ organizationId: input.organizationId, title: input.title }, "[NOTIFY_SKIPPED] no campus recipients resolved");
        }
        return { delivered: 0 };
      }
      const data = members.map((m) => ({
        scope: "ORGANIZATION" as const,
        memberId: m.id,
        organizationId: input.organizationId as string,
        title: input.title,
        message: input.message,
        type: input.type,
        requestId: input.requestId ?? undefined,
      }));
      try {
        await db.notification.createMany({ data });
        return { delivered: members.length };
      } catch (e) {
        logger.error({ err: e }, "[NOTIFY_FAILED]");
        return { delivered: 0 };
      }
    }

    if (requestedIds.length === 0) return { delivered: 0 };
    const data = requestedIds.map((userId) => ({
      scope: "PLATFORM" as const,
      userId,
      title: input.title,
      message: input.message,
      type: input.type,
      requestId: input.requestId ?? undefined,
    }));
    try {
      await db.notification.createMany({ data });
      return { delivered: requestedIds.length };
    } catch (e) {
      logger.error({ err: e }, "[NOTIFY_FAILED]");
      return { delivered: 0 };
    }
  }

  private inboxWhere(userId: string, tenant: TenantContext | undefined): Prisma.NotificationWhereInput {
    const memberId = tenant?.memberId;
    const organizationId = tenant?.organizationId ?? null;
    if (memberId && organizationId) {
      return {
        OR: [
          { scope: "PLATFORM" as const, userId },
          { scope: "ORGANIZATION" as const, memberId, organizationId },
        ],
      };
    }
    return { scope: "PLATFORM" as const, userId };
  }

  async list(userId: string, tenant: TenantContext | undefined, query: ListQuery) {
    const { skip, take } = parsePagination(query, 10);
    const where = this.inboxWhere(userId, tenant);

    const [items, unread, total] = await Promise.all([
      this.db.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      this.db.notification.count({ where: { ...where, isRead: false } }),
      this.db.notification.count({ where }),
    ]);

    const requestIds = [...new Set(items.map((n) => n.requestId).filter((id): id is string => Boolean(id)))];
    const refs = requestIds.length
      ? await this.db.serviceRequest.findMany({ where: { id: { in: requestIds } }, select: { id: true, reference: true } })
      : [];
    const refById = new Map(refs.map((r) => [r.id, r.reference]));

    return { items: items.map((n) => ({ ...n, requestReference: n.requestId ? refById.get(n.requestId) ?? null : null })), unread, total };
  }

  async markRead(userId: string, id: string, _tenant: TenantContext | undefined) {
    const notification = await this.db.notification.findUnique({ where: { id }, include: { member: { select: { userId: true } } } });
    if (!notification) throw new NotFoundException("Notification not found.");
    const owned = notification.scope === "ORGANIZATION"
      ? notification.member?.userId === userId
      : notification.userId === userId;
    if (!owned) throw new NotFoundException("Notification not found.");
    await this.db.notification.update({ where: { id }, data: { isRead: true } });
    return { success: true };
  }

  async markAllRead(userId: string, tenant: TenantContext | undefined) {
    await this.db.notification.updateMany({ where: { ...this.inboxWhere(userId, tenant), isRead: false }, data: { isRead: true } });
    return { success: true };
  }
}
