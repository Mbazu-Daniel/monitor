import type { Prisma, PrismaClient } from "../generated/prisma/client.ts";
import { TenantScope, scopedOrganizationId } from "../common/utils/tenant-scope.ts";
import { averageResolutionHours } from "../common/utils/resolution-hours.ts";
import { toLogActor } from "../common/utils/actor.ts";
import type { TenantContext } from "../common/guards/session.guard.ts";
import { PRIORITIES, STATUSES } from "@mivacampus/contracts";

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export async function computeAdminStats(db: PrismaClient, tenant: TenantContext | undefined) {
  const scope = TenantScope.of(tenant);
  const orgId = scope.organizationId;
  const tenantWhere: Prisma.ServiceRequestWhereInput = scope.where();
  const memberFilter = scope.some();
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [statusGroups, priorityGroups, categoryGroups, totalRequests, unassigned, totalUsers, resolvedThisMonth, officerMembers, trendGroups, recentActivityRows] =
    await Promise.all([
      db.serviceRequest.groupBy({ by: ["status"], _count: true, where: tenantWhere }),
      db.serviceRequest.groupBy({ by: ["priority"], _count: true, where: tenantWhere }),
      db.category.findMany({
        where: { OR: [{ organizationId: null }, ...(orgId ? [{ organizationId: orgId }] : [])] },
        include: { _count: { select: { requests: { where: tenantWhere } } } },
        orderBy: { name: "asc" },
      }),
      db.serviceRequest.count({ where: tenantWhere }),
      db.serviceRequest.count({ where: { ...tenantWhere, status: "OPEN" } }),
      db.user.count({ where: { isActive: true, memberships: memberFilter } }),
      db.serviceRequest.count({ where: { ...tenantWhere, status: "RESOLVED", updatedAt: { gte: monthStart } } }),
      db.member.findMany({
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
      db.serviceRequest.findMany({
        where: { ...tenantWhere, createdAt: { gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 180) } },
        select: { createdAt: true },
      }),
      db.auditLog.findMany({
        where: { organizationId: scopedOrganizationId(orgId) },
        include: {
          member: { select: { role: true, user: { select: { id: true, name: true } } } },
          user: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
    ]);

  const resolvedWithTimes = await db.statusLog.findMany({
    where: { toStatus: "RESOLVED", request: { organizationId: orgId } },
    select: { createdAt: true, request: { select: { createdAt: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const byStatus = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  statusGroups.forEach((g) => { byStatus[g.status] = g._count; });
  const byPriority = Object.fromEntries(PRIORITIES.map((p) => [p, 0]));
  priorityGroups.forEach((g) => { byPriority[g.priority] = g._count; });

  const avgResolutionHours = averageResolutionHours(resolvedWithTimes);

  const officerResolved = await db.statusLog.groupBy({
    by: ["memberId"],
    where: { toStatus: "RESOLVED", member: { ...scope.where(), role: "OFFICER" } },
    _count: true,
  });

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
