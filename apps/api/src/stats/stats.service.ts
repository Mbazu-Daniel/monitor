import { Inject, Injectable } from "@nestjs/common";
import type { Prisma, PrismaClient } from "../generated/prisma/client.ts";
import { PRISMA } from "../common/constants/prisma-token.ts";
import { TenantScope, scopedOrganizationId } from "../common/utils/tenant-scope.ts";
import { averageResolutionHours } from "../common/utils/resolution-hours.ts";
import { requestIncludeForList, toActor, toLogActor } from "../common/utils/actor.ts";
import type { TenantContext } from "../common/guards/session.guard.ts";

const STATUSES = ["OPEN", "ASSIGNED", "IN_PROGRESS", "ON_HOLD", "RESOLVED", "CLOSED", "REJECTED"] as const;
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

type ListRow = Record<string, unknown> & { creator: { role: string; user: Record<string, unknown> } | null };

const mapRow = <T extends ListRow>(row: T) => ({ ...row, creator: toActor(row.creator) });

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
    const scope = TenantScope.of(tenant);
    const orgId = scope.organizationId;
    const tenantWhere: Prisma.ServiceRequestWhereInput = scope.where();
    const memberFilter = scope.some();
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [statusGroups, priorityGroups, categoryGroups, totalRequests, unassigned, totalUsers, resolvedThisMonth, officerMembers, trendGroups, recentActivityRows] =
      await Promise.all([
        this.db.serviceRequest.groupBy({ by: ["status"], _count: true, where: tenantWhere }),
        this.db.serviceRequest.groupBy({ by: ["priority"], _count: true, where: tenantWhere }),
        this.db.category.findMany({
          where: { OR: [{ organizationId: null }, ...(orgId ? [{ organizationId: orgId }] : [])] },
          include: { _count: { select: { requests: { where: tenantWhere } } } },
          orderBy: { name: "asc" },
        }),
        this.db.serviceRequest.count({ where: tenantWhere }),
        this.db.serviceRequest.count({ where: { ...tenantWhere, status: "OPEN" } }),
        this.db.user.count({ where: { isActive: true, memberships: memberFilter } }),
        this.db.serviceRequest.count({ where: { ...tenantWhere, status: "RESOLVED", updatedAt: { gte: monthStart } } }),
        this.db.member.findMany({
          where: { ...scope.where(), role: "OFFICER", user: { isActive: true } },
          select: {
            id: true,
            role: true,
            user: { select: { id: true, name: true } },
            officerAssignments: {
              where: { isActive: true, request: { status: { in: ["ASSIGNED", "IN_PROGRESS", "ON_HOLD"] } } },
              select: { id: true },
            },
          },
        }),
        this.db.serviceRequest.findMany({
          where: { ...tenantWhere, createdAt: { gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 180) } },
          select: { createdAt: true },
        }),
        this.db.auditLog.findMany({
          where: { organizationId: scopedOrganizationId(orgId) },
          include: {
            member: { select: { role: true, user: { select: { id: true, name: true } } } },
            user: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 8,
        }),
      ]);

    const resolvedWithTimes = await this.db.statusLog.findMany({
      where: { toStatus: "RESOLVED", request: { organizationId: orgId } },
      select: { createdAt: true, request: { select: { createdAt: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    const byStatus = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<string, number>;
    statusGroups.forEach((g) => { byStatus[g.status] = g._count; });
    const byPriority = Object.fromEntries(PRIORITIES.map((p) => [p, 0])) as Record<string, number>;
    priorityGroups.forEach((g) => { byPriority[g.priority] = g._count; });

    const avgResolutionHours = averageResolutionHours(resolvedWithTimes);

    const officerResolved = (await this.db.statusLog.groupBy({
      by: ["memberId"],
      where: { toStatus: "RESOLVED", member: { ...scope.where(), role: "OFFICER" } },
      _count: true,
    })) as unknown as { memberId: string; _count: number }[];

    const officerWorkload = officerMembers.map((o) => ({
      id: o.user.id,
      name: o.user.name,
      active: o.officerAssignments.length,
      resolved: officerResolved.find((r) => r.memberId === o.id)?._count ?? 0,
    }));
    const totalOfficers = officerMembers.length;

    const recentActivity = recentActivityRows.map(({ member, user, ...log }) => ({
      ...log,
      user: toLogActor({ member, user }),
    }));

    const monthlyTrend: { month: string; count: number }[] = [];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      monthlyTrend.push({
        month: `${monthNames[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`,
        count: trendGroups.filter((r) => {
          const c = new Date(r.createdAt);
          return c >= start && c < end;
        }).length,
      });
    }

    return {
      totalRequests,
      byStatus,
      byPriority,
      byCategory: categoryGroups.map((c) => ({ name: c.name, icon: c.icon, count: c._count.requests })),
      unassigned,
      totalUsers,
      totalOfficers,
      resolvedThisMonth,
      avgResolutionHours,
      officerWorkload,
      monthlyTrend,
      recentActivity,
    };
  }
}
