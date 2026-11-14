import { Inject, Injectable } from "@nestjs/common";
import type { Prisma, PrismaClient } from "../generated/prisma/client.ts";
import { PRISMA } from "../common/constants/prisma-token.ts";
import { csvEscape } from "./csv.ts";
import type { TenantContext } from "../common/guards/session.types.ts";
import { TenantScope } from "../common/tenancy/tenant-scope.ts";
import type { ListQuery } from "../common/dto/list-query.dto.ts";

export const MAX_EXPORT_ROWS = 10_000;

@Injectable()
export class ExportService {
  constructor(@Inject(PRISMA) private readonly db: PrismaClient) {}
  async requestsCsv(query: ListQuery, tenant: TenantContext | undefined) {
    const scope = TenantScope.of(tenant);
    const where: Prisma.ServiceRequestWhereInput = { ...scope.where() };

    if (tenant?.role === "OFFICER") {
      where.assignments = { some: { officerId: scope.memberIdOrNoMatch(), isActive: true } };
    }

    const and: Prisma.ServiceRequestWhereInput[] = [];
    if (query.status) and.push({ status: query.status });
    if (query.priority) and.push({ priority: query.priority });
    if (query.categoryId) and.push({ categoryId: query.categoryId });
    if (and.length) where.AND = and;

    const fetched = await this.db.serviceRequest.findMany({
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
      take: MAX_EXPORT_ROWS + 1,
    });

    const truncated = fetched.length > MAX_EXPORT_ROWS;
    const requests = truncated ? fetched.slice(0, MAX_EXPORT_ROWS) : fetched;

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

    return { csv, count: requests.length, truncated };
  }
}
