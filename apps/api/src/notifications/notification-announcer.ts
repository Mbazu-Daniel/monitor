import { Inject, Injectable } from "@nestjs/common";
import type { Prisma, PrismaClient } from "../generated/prisma/client.ts";
import { PRISMA } from "../common/constants/prisma-token.ts";
import { logger } from "../common/logger.ts";
import type { NotificationType } from "@mivacampus/contracts";

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
export class NotificationAnnouncer {
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
}
