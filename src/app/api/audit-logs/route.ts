import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { handleApiError, ok, requireRole, parsePagination } from "@/lib/api-helpers";

// GET /api/audit-logs — ADMIN only, paginated activity log
export async function GET(req: NextRequest) {
  try {
    await requireRole(req, ["ADMIN"]);
    const url = new URL(req.url);
    const { page, pageSize, skip, take } = parsePagination(url);
    const search = url.searchParams.get("search")?.trim();
    const action = url.searchParams.get("action");

    const where: Prisma.AuditLogWhereInput = {};
    const and: Prisma.AuditLogWhereInput[] = [];
    if (search) {
      and.push({
        OR: [
          { action: { contains: search } },
          { details: { contains: search } },
          { user: { name: { contains: search } } },
        ],
      });
    }
    if (action) and.push({ action });
    if (and.length) where.AND = and;

    const [total, items] = await Promise.all([
      db.auditLog.count({ where }),
      db.auditLog.findMany({
        where,
        include: { user: { select: { id: true, name: true, role: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
    ]);

    return ok({ items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) });
  } catch (err) {
    return handleApiError(err);
  }
}
