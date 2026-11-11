import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { handleApiError, requireAuth, audit } from "@/lib/api-helpers";

function csvEscape(value: string | number | null | undefined): string {
  const s = value === null || value === undefined ? "" : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

// GET /api/export/requests — CSV export (ADMIN: all, OFFICER: assigned to them)
export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    if (session.role !== "ADMIN" && session.role !== "OFFICER") {
      return new Response("Forbidden", { status: 403 });
    }
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const priority = url.searchParams.get("priority");
    const categoryId = url.searchParams.get("categoryId");

    const where: Prisma.ServiceRequestWhereInput = {};
    if (session.role === "OFFICER") {
      where.assignments = { some: { officerId: session.sub, isActive: true } };
    }
    const and: Prisma.ServiceRequestWhereInput[] = [];
    if (status) and.push({ status });
    if (priority) and.push({ priority });
    if (categoryId) and.push({ categoryId });
    if (and.length) where.AND = and;

    const requests = await db.serviceRequest.findMany({
      where,
      include: {
        category: true,
        creator: { select: { name: true, email: true, department: true } },
        assignments: { where: { isActive: true }, include: { officer: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });

    const header = ["Reference", "Title", "Category", "Location", "Priority", "Status", "Submitted By", "Department", "Assigned Officer", "Created", "Last Updated"];
    const rows = requests.map((r) => [
      r.reference,
      r.title,
      r.category.name,
      r.location,
      r.priority,
      r.status,
      r.creator.name,
      r.creator.department || "",
      r.assignments[0]?.officer.name || "Unassigned",
      new Date(r.createdAt).toISOString(),
      new Date(r.updatedAt).toISOString(),
    ]);

    const csv =
      "\uFEFF" + // BOM so Excel opens UTF-8 correctly
      [header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\r\n");

    await audit(session.sub, "DATA_EXPORTED", "REQUEST", null, `${session.name} exported ${requests.length} request(s) to CSV`);

    const date = new Date().toISOString().slice(0, 10);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="maintenance-requests-${date}.csv"`,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
