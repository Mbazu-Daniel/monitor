import { Inject, Injectable } from "@nestjs/common";
import type { Prisma, PrismaClient } from "../generated/prisma/client.ts";
import { PRISMA } from "../common/constants/prisma-token.ts";
import { parsePagination } from "../common/pagination.ts";
import { scopedOrganizationId } from "../common/tenancy/tenant-scope.ts";
import type { ListQuery } from "../common/dto/list-query.dto.ts";

@Injectable()
export class UserReportingService {
  constructor(@Inject(PRISMA) private readonly db: PrismaClient) {}

  async list(query: ListQuery, organizationId: string | null, actorRole: string | null = null) {
    const { page, pageSize, skip, take } = parsePagination(query, 10);
    const search = query.search;
    const role = actorRole === "STAFF" ? "STUDENT" : query.role;

    const and: Prisma.UserWhereInput[] = [
      { memberships: { some: { organizationId: scopedOrganizationId(organizationId) } } },
    ];
    if (search) {
      and.push({
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { department: { contains: search, mode: "insensitive" } },
          { matricNo: { contains: search, mode: "insensitive" } },
        ],
      });
    }
    if (role) and.push({ memberships: { some: { organizationId: scopedOrganizationId(organizationId), role } } });
    const where: Prisma.UserWhereInput = { AND: and };

    const [total, users] = await Promise.all([
      this.db.user.count({ where }),
      this.db.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          department: true,
          phone: true,
          matricNo: true,
          isActive: true,
          createdAt: true,
          memberships: { where: { organizationId: scopedOrganizationId(organizationId) }, select: { id: true, role: true }, take: 1 },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
    ]);

    const memberIds = users.flatMap((u) => u.memberships.map((m) => m.id));
    const [requestCounts, assignmentCounts] = memberIds.length
      ? await Promise.all([
          this.db.serviceRequest.groupBy({
            by: ["creatorId"],
            where: { creatorId: { in: memberIds }, organizationId: scopedOrganizationId(organizationId) },
            _count: { _all: true },
          }),
          this.db.assignment.groupBy({
            by: ["officerId"],
            where: { officerId: { in: memberIds }, isActive: true },
            _count: { _all: true },
          }),
        ])
      : [[], []];
    const requestsByMember = new Map(requestCounts.map((r) => [r.creatorId, r._count._all]));
    const assignmentsByMember = new Map(assignmentCounts.map((a) => [a.officerId, a._count._all]));

    const items = users.map(({ memberships, ...u }) => {
      const member = memberships[0];
      const memberId = member?.id;
      return {
        ...u,
        role: member?.role ?? null,
        _count: {
          requests: (memberId && requestsByMember.get(memberId)) || 0,
          assignments: (memberId && assignmentsByMember.get(memberId)) || 0,
        },
      };
    });
    return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
  }
}
