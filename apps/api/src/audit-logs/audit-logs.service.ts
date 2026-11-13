import { Inject, Injectable } from "@nestjs/common";
import type { Prisma, PrismaClient } from "../generated/prisma/client.ts";
import { PRISMA } from "../common/constants/prisma-token.ts";
import { parsePagination } from "../common/utils/pagination.ts";
import { toLogActor } from "../common/utils/actor.ts";
import type { ListQuery } from "../common/dto/list-query.dto.ts";

@Injectable()
export class AuditLogsService {
  constructor(@Inject(PRISMA) private readonly db: PrismaClient) {}
  async list(query: ListQuery, organizationId: string | null) {
    const { page, pageSize, skip, take } = parsePagination(query, 10);
    const search = query.search;
    const action = query.action;

    const and: Prisma.AuditLogWhereInput[] = [{ organizationId }];
    if (search) {
      and.push({
        OR: [
          { action: { contains: search, mode: "insensitive" } },
          { details: { contains: search, mode: "insensitive" } },
          { user: { name: { contains: search, mode: "insensitive" } } },
          { member: { user: { name: { contains: search, mode: "insensitive" } } } },
        ],
      });
    }
    if (action) and.push({ action });

    const where: Prisma.AuditLogWhereInput = { AND: and };

    const [total, items] = await Promise.all([
      this.db.auditLog.count({ where }),
      this.db.auditLog.findMany({
        where,
        include: {
          member: { select: { role: true, user: { select: { id: true, name: true } } } },
          user: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
    ]);

    return {
      items: items.map(({ member, user, ...log }) => ({
        ...log,
        user: toLogActor({ member, user }),
      })),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }
}
