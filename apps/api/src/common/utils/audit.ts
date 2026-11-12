import { Injectable } from "@nestjs/common";
import { prisma } from "./prisma.ts";
import { logger } from "../logger.ts";
import type { Prisma } from "../../generated/prisma/client.ts";
import type { AuditAction } from "@mivacampus/contracts";

export type AuditEntity = "USER" | "REQUEST" | "CATEGORY" | "AUTH" | "SYSTEM" | "ORGANIZATION";

export type AuditScope = "PLATFORM" | "ORGANIZATION";

export interface AuditInput {
  userId: string | null;
  memberId?: string | null;
  action: AuditAction;
  entityType: AuditEntity;
  entityId?: string | null;
  details?: string;
  organizationId?: string | null;
  scope?: AuditScope;
}

type AuditRow = {
  scope: AuditScope;
  userId: string | null;
  memberId?: string;
  action: AuditAction;
  entityType: AuditEntity;
  entityId?: string;
  details?: string;
  organizationId?: string;
};

function toRow({ userId, memberId, action, entityType, entityId, details, organizationId, scope }: AuditInput): AuditRow | null {
  const resolvedScope: AuditScope = scope ?? (organizationId ? "ORGANIZATION" : "PLATFORM");
  if (resolvedScope === "ORGANIZATION" && !organizationId) {
    logger.error({ action, entityId }, "[AUDIT_DROPPED] organization-scope audit entry is missing organizationId");
    return null;
  }
  return {
    scope: resolvedScope,
    userId,
    memberId: memberId ?? undefined,
    action,
    entityType,
    entityId: entityId ?? undefined,
    details,
    organizationId: organizationId ?? undefined,
  };
}

async function persistQuietly(input: AuditInput): Promise<void> {
  const data = toRow(input);
  if (!data) return;
  try {
    await prisma.auditLog.create({ data });
  } catch (e) {
    logger.error({ err: e, action: input.action, entityId: input.entityId }, "[AUDIT_FAILED]");
  }
}

@Injectable()
export class AuditSink {
  async inTx(tx: Prisma.TransactionClient, input: AuditInput): Promise<void> {
    const data = toRow(input);
    if (!data) return;
    await tx.auditLog.create({ data });
  }

  async platform(input: AuditInput): Promise<void> {
    return persistQuietly(input);
  }
}

export async function auditPlatform(input: AuditInput): Promise<void> {
  return persistQuietly(input);
}
