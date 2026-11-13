import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma, PrismaClient } from "../generated/prisma/client.ts";
import { PRISMA } from "../common/constants/prisma-token.ts";
import { parsePagination } from "../common/utils/pagination.ts";
import type { TenantContext } from "../common/guards/session.types.ts";
import type { ListQuery } from "../common/dto/list-query.dto.ts";

@Injectable()
export class NotificationInbox {
  constructor(@Inject(PRISMA) private readonly db: PrismaClient) {}

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
