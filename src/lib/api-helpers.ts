import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { db } from "@/lib/db";
import { getSessionFromRequest, SessionPayload } from "@/lib/auth";

/**
 * Shared API helpers: responses, validation, RBAC guards,
 * notification creation, audit trail and helpers.
 */

// ---------------- Responses ----------------

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function fail(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

export function handleApiError(err: unknown) {
  if (err instanceof ApiGuardError) {
    return fail(err.message, err.status);
  }
  if (err instanceof ZodError) {
    const first = err.issues[0];
    return fail(first ? `${first.path.join(".") ? first.path.join(".") + ": " : ""}${first.message}` : "Validation failed", 422, {
      issues: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
  }
  console.error("[API_ERROR]", err);
  return fail("Something went wrong on the server. Please try again.", 500);
}

// ---------------- Auth guards (RBAC) ----------------

export class ApiGuardError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function requireAuth(req: Request): Promise<SessionPayload> {
  const session = getSessionFromRequest(req);
  if (!session) throw new ApiGuardError("You must be signed in to do that.", 401);
  const user = await db.user.findUnique({ where: { id: session.sub }, select: { isActive: true } });
  if (!user || !user.isActive) throw new ApiGuardError("Your account is inactive. Contact an administrator.", 403);
  return session;
}

export async function requireRole(req: Request, roles: string[]): Promise<SessionPayload> {
  const session = await requireAuth(req);
  if (!roles.includes(session.role)) {
    throw new ApiGuardError("You do not have permission to perform this action.", 403);
  }
  return session;
}

// ---------------- Reference number ----------------

export async function generateReference(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await db.serviceRequest.count();
  return `SR-${year}-${String(count + 1).padStart(4, "0")}`;
}

// ---------------- Notifications ----------------

export async function notify(
  userId: string,
  title: string,
  message: string,
  type: "INFO" | "SUCCESS" | "WARNING" | "ASSIGNMENT" | "STATUS" | "COMMENT" = "INFO",
  requestId?: string
) {
  try {
    await db.notification.create({ data: { userId, title, message, type, requestId } });
  } catch (e) {
    console.error("[NOTIFY_FAILED]", e);
  }
}

export async function notifyAdmins(title: string, message: string, type: Parameters<typeof notify>[3] = "INFO", requestId?: string) {
  const admins = await db.user.findMany({ where: { role: "ADMIN", isActive: true }, select: { id: true } });
  await Promise.all(admins.map((a) => notify(a.id, title, message, type, requestId)));
}

// ---------------- Audit trail ----------------

export async function audit(
  userId: string | null,
  action: string,
  entityType: "USER" | "REQUEST" | "CATEGORY" | "AUTH" | "SYSTEM",
  entityId?: string | null,
  details?: string
) {
  try {
    await db.auditLog.create({ data: { userId, action, entityType, entityId: entityId ?? undefined, details } });
  } catch (e) {
    console.error("[AUDIT_FAILED]", e);
  }
}

// ---------------- Status transition rules ----------------

const TRANSITIONS: Record<string, string[]> = {
  OPEN: ["ASSIGNED", "IN_PROGRESS", "REJECTED"],
  ASSIGNED: ["IN_PROGRESS", "ON_HOLD", "REJECTED", "OPEN"],
  IN_PROGRESS: ["ON_HOLD", "RESOLVED", "REJECTED"],
  ON_HOLD: ["IN_PROGRESS", "RESOLVED", "REJECTED"],
  RESOLVED: ["CLOSED", "IN_PROGRESS"],
  CLOSED: ["OPEN"],
  REJECTED: ["OPEN"],
};

export function canTransition(from: string, to: string): boolean {
  return (TRANSITIONS[from] || []).includes(to);
}

/**
 * Determine whether a user (session) may move a request between statuses.
 * - ADMIN: any valid transition
 * - OFFICER: only on requests assigned to them, only operational transitions
 * - CREATOR: may confirm/close a RESOLVED request
 */
export function checkStatusPermission(
  session: SessionPayload,
  from: string,
  to: string,
  isAssignedOfficer: boolean,
  isCreator: boolean
): string | null {
  if (!canTransition(from, to)) return `Cannot change status from ${from} to ${to}.`;
  if (session.role === "ADMIN") return null;
  if (to === "CLOSED") {
    return isCreator && from === "RESOLVED"
      ? null
      : "Only the request owner can close a resolved request, or an administrator.";
  }
  if (session.role === "OFFICER") {
    if (!isAssignedOfficer) return "You can only update requests assigned to you.";
    const allowed = ["IN_PROGRESS", "ON_HOLD", "RESOLVED"];
    if (allowed.includes(to)) return null;
    return "Maintenance officers can set In Progress, On Hold or Resolved.";
  }
  return "You do not have permission to change this request's status.";
}

// ---------------- Pagination helper ----------------

export function parsePagination(url: URL) {
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(url.searchParams.get("pageSize") || "8", 10) || 8));
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}
