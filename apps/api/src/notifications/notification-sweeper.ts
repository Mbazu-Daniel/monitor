import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import type { PrismaClient } from "../generated/prisma/client.ts";
import { PRISMA } from "../common/constants/prisma-token.ts";
import { logger } from "../common/logger.ts";
import type { NotificationType } from "@mivacampus/contracts";

const SWEEP_INTERVAL_MS = 10_000;
const SWEEP_BATCH = 20;
const MAX_ATTEMPTS = 10;

interface OutboxRow {
  id: string;
  organizationId: string | null;
  title: string;
  message: string;
  type: string;
  requestId: string | null;
  payload: { userIds?: string[]; orgAdmins?: boolean };
  attempts: number;
}

@Injectable()
export class NotificationSweeper implements OnModuleInit, OnModuleDestroy {
  private timer: NodeJS.Timeout | undefined;
  private running = false;

  constructor(@Inject(PRISMA) private readonly db: PrismaClient) {}

  onModuleInit() {
    if (process.env.NODE_ENV === "test") return;
    this.timer = setInterval(() => {
      void this.sweep();
    }, SWEEP_INTERVAL_MS);
    this.timer.unref?.();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async sweep() {
    if (this.running) return;
    this.running = true;
    try {
      const rows = await this.claimBatch();
      for (const row of rows) {
        await this.deliver(row);
      }
    } catch (error) {
      logger.error({ err: error }, "[METRIC] notification_sweep_failed");
    } finally {
      this.running = false;
    }
  }

  private claimBatch(): Promise<OutboxRow[]> {
    return this.db.$queryRaw<OutboxRow[]>`
      UPDATE "notification_outbox"
      SET "claimedAt" = now(), "attempts" = "attempts" + 1
      WHERE "id" IN (
        SELECT "id" FROM "notification_outbox"
        WHERE "publishedAt" IS NULL
          AND ("claimedAt" IS NULL OR "claimedAt" < now() - interval '2 minutes')
        ORDER BY "createdAt"
        LIMIT ${SWEEP_BATCH}
        FOR UPDATE SKIP LOCKED
      )
      RETURNING "id", "organizationId", "title", "message", "type", "requestId", "payload", "attempts"
    `;
  }

  private async deliver(row: OutboxRow) {
    try {
      const data = await this.buildRows(row);
      if (data.length > 0) {
        await this.db.notification.createMany({ data });
      }
      await this.db.notificationOutbox.update({ where: { id: row.id }, data: { publishedAt: new Date() } });
    } catch (error) {
      if (row.attempts >= MAX_ATTEMPTS) {
        await this.db.notificationOutbox.update({ where: { id: row.id }, data: { publishedAt: new Date() } }).catch(() => undefined);
        logger.error({ err: error, outboxId: row.id, title: row.title }, "[METRIC] notify_dlq");
        return;
      }
      logger.error({ err: error, outboxId: row.id, attempts: row.attempts }, "[METRIC] notify_retry");
    }
  }

  private async buildRows(row: OutboxRow) {
    const audience = row.payload ?? {};
    const requestedIds = [...new Set(audience.userIds ?? [])];
    const base = {
      title: row.title,
      message: row.message,
      type: row.type as NotificationType,
      requestId: row.requestId ?? undefined,
    };

    if (row.organizationId) {
      let members: { id: string }[] = [];
      if (audience.orgAdmins) {
        members = await this.db.member.findMany({
          where: { organizationId: row.organizationId, role: "ADMIN", user: { isActive: true } },
          select: { id: true },
        });
      } else if (requestedIds.length) {
        members = await this.db.member.findMany({
          where: { organizationId: row.organizationId, userId: { in: requestedIds }, user: { isActive: true } },
          select: { id: true },
        });
      }
      return members.map((member) => ({
        scope: "ORGANIZATION" as const,
        memberId: member.id,
        organizationId: row.organizationId as string,
        ...base,
      }));
    }

    return requestedIds.map((userId) => ({
      scope: "PLATFORM" as const,
      userId,
      ...base,
    }));
  }
}
