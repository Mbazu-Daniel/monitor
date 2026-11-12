import { Inject, Injectable } from "@nestjs/common";
import type { Prisma, PrismaClient } from "../generated/prisma/client.ts";
import { PRISMA } from "../common/constants/prisma-token.ts";
import { csvEscape } from "../common/utils/csv.ts";
import type { TenantContext } from "../common/guards/session.guard.ts";
import { TenantScope } from "../common/utils/tenant-scope.ts";

@Injectable()
export class ExportService {
  constructor(@Inject(PRISMA) private readonly db: PrismaClient) {}
  async requestsCsv(query: Record<string, unknown>, user: { id: string }, tenant: TenantContext | undefined) {
    const scope = TenantScope.of(tenant);
    const where: Prisma.ServiceRequestWhereInput = { ...scope.where() };

    if (tenant?.role === "OFFICER") {
      where.assignments = { some: { officerId: scope.memberIdOrNoMatch(), isActive: true } };
    }

    const status = typeof query.status === "string" ? query.status : undefined;
    const priority = typeof query.priority === "string" ? query.priority : undefined;
    const categoryId = typeof query.categoryId === "string" ? query.categoryId : undefined;
    const and: Prisma.ServiceRequestWhereInput[] = [];
    if (status) and.push({ status });
    if (priority) and.push({ priority });
    if (categoryId) and.push({ categoryId });
    if (and.length) where.AND = and;

    const requests = await this.db.serviceRequest.findMany({
      where,
      include: {
        category: true,
        creator: { select: { user: { select: { name: true, email: true, department: true } } } },
        assignments: {
          where: { isActive: true },
          include: { officer: { select: { user: { select: { name: true } } } } },
        },
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
      r.creator.user.name,
      r.creator.user.department || "",
      r.assignments[0]?.officer.user.name || "Unassigned",
      new Date(r.createdAt).toISOString(),
      new Date(r.updatedAt).toISOString(),
    ]);

    const csv =
      "\uFEFF" + [header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\r\n");

    return { csv, count: requests.length };
  }
}
