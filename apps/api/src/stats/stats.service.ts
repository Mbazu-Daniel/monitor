import { Inject, Injectable } from "@nestjs/common";
import type { Prisma, PrismaClient } from "../generated/prisma/client.ts";
import { computeAdminStats } from "./admin-stats.ts";
import { PRISMA } from "../common/constants/prisma-token.ts";
import { TenantScope } from "../common/tenancy/tenant-scope.ts";
import { averageResolutionHours } from "./resolution-hours.ts";
import { requestIncludeForList, toActor } from "../common/actor.ts";
import type { TenantContext } from "../common/guards/session.types.ts";


type ListItem = Prisma.ServiceRequestGetPayload<{ include: typeof requestIncludeForList }>;

const mapRow = (row: ListItem) => ({ ...row, creator: toActor(row.creator) });

@Injectable()
export class StatsService {
  constructor(@Inject(PRISMA) private readonly db: PrismaClient) {}
  async getPersonalStats(tenant: TenantContext | undefined) {
    const scope = TenantScope.of(tenant);
    const memberId = scope.memberIdOrNoMatch();

    const where = { creatorId: memberId, organizationId: scope.where().organizationId };
    const [total, open, inProgress, resolved, recent] = await Promise.all([
      this.db.serviceRequest.count({ where }),
      this.db.serviceRequest.count({ where: { ...where, status: { in: ["OPEN", "ASSIGNED"] } } }),
      this.db.serviceRequest.count({ where: { ...where, status: { in: ["IN_PROGRESS", "ON_HOLD"] } } }),
      this.db.serviceRequest.count({ where: { ...where, status: { in: ["RESOLVED", "CLOSED"] } } }),
      this.db.serviceRequest.findMany({
        where,
        include: requestIncludeForList,
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);
    return { total, open, inProgress, resolved, recent: recent.map(mapRow) };
  }

  async getOfficerStats(tenant: TenantContext | undefined) {
    const scope = TenantScope.of(tenant);
    const memberId = scope.memberIdOrNoMatch();

    const activeAssignments = await this.db.assignment.findMany({
      where: { officerId: memberId, isActive: true },
      select: { requestId: true },
    });
    const ids = activeAssignments.map((a) => a.requestId);
    const where = { id: { in: ids }, organizationId: scope.where().organizationId };

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [assignedTotal, newAssigned, inProgress, onHold, resolvedThisMonth, recent, resolvedWithTimes] = await Promise.all([
      this.db.serviceRequest.count({ where }),
      this.db.serviceRequest.count({ where: { ...where, status: "ASSIGNED" } }),
      this.db.serviceRequest.count({ where: { ...where, status: "IN_PROGRESS" } }),
      this.db.serviceRequest.count({ where: { ...where, status: "ON_HOLD" } }),
      this.db.serviceRequest.count({ where: { ...where, status: "RESOLVED", updatedAt: { gte: monthStart } } }),
      this.db.serviceRequest.findMany({
        where: { ...where, status: { notIn: ["CLOSED", "REJECTED"] } },
        include: requestIncludeForList,
        orderBy: { updatedAt: "desc" },
        take: 6,
      }),
      this.db.statusLog.findMany({
        where: { toStatus: "RESOLVED", request: { organizationId: scope.where().organizationId, assignments: { some: { officerId: memberId } } } },
        select: { createdAt: true, request: { select: { createdAt: true } } },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    ]);

    const avgResolutionHours = averageResolutionHours(resolvedWithTimes);

    return { assignedTotal, newAssigned, inProgress, onHold, resolvedThisMonth, avgResolutionHours, recent: recent.map(mapRow) };
  }

  async getAdminStats(tenant: TenantContext | undefined) {
    return computeAdminStats(this.db, tenant);
  }
}
