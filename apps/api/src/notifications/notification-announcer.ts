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
    const payload = {
      userIds: [...new Set(audience.userIds ?? [])],
      orgAdmins: audience.orgAdmins === true,
      organizationId: input.organizationId,
    };
    try {
      await db.notificationOutbox.create({
        data: {
          organizationId: input.organizationId ?? null,
          title: input.title,
          message: input.message,
          type: input.type,
          requestId: input.requestId ?? null,
          payload,
        },
      });
      return { queued: true };
    } catch (error) {
      logger.error({ err: error, title: input.title, organizationId: input.organizationId }, "[METRIC] notify_outbox_insert_failed");
      return { queued: false };
    }
  }
}
