import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { handleApiError, ok, requireAuth } from "@/lib/api-helpers";

const STATUSES = ["OPEN", "ASSIGNED", "IN_PROGRESS", "ON_HOLD", "RESOLVED", "CLOSED", "REJECTED"] as const;
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

// GET /api/stats — role-scoped dashboard statistics
export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);

    if (session.role === "STUDENT" || session.role === "STAFF") {
      const where = { creatorId: session.sub };
      const [total, open, inProgress, resolved, recent] = await Promise.all([
        db.serviceRequest.count({ where }),
        db.serviceRequest.count({ where: { ...where, status: { in: ["OPEN", "ASSIGNED"] } } }),
        db.serviceRequest.count({ where: { ...where, status: { in: ["IN_PROGRESS", "ON_HOLD"] } } }),
        db.serviceRequest.count({ where: { ...where, status: { in: ["RESOLVED", "CLOSED"] } } }),
        db.serviceRequest.findMany({
          where,
          include: {
            category: true,
            creator: { select: { id: true, name: true, email: true, role: true, department: true, matricNo: true } },
            attachments: { select: { id: true, filename: true, mimeType: true, size: true } },
            _count: { select: { comments: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 5,
        }),
      ]);
      return ok({ total, open, inProgress, resolved, recent });
    }

    if (session.role === "OFFICER") {
      const activeAssignments = await db.assignment.findMany({
        where: { officerId: session.sub, isActive: true },
        select: { requestId: true },
      });
      const ids = activeAssignments.map((a) => a.requestId);
      const where = { id: { in: ids } };

      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const [assignedTotal, newAssigned, inProgress, onHold, resolvedThisMonth, recent, resolvedWithTimes] = await Promise.all([
        db.serviceRequest.count({ where }),
        db.serviceRequest.count({ where: { ...where, status: "ASSIGNED" } }),
        db.serviceRequest.count({ where: { ...where, status: "IN_PROGRESS" } }),
        db.serviceRequest.count({ where: { ...where, status: "ON_HOLD" } }),
        db.serviceRequest.count({ where: { ...where, status: "RESOLVED", updatedAt: { gte: monthStart } } }),
        db.serviceRequest.findMany({
          where: { ...where, status: { notIn: ["CLOSED", "REJECTED"] } },
          include: {
            category: true,
            creator: { select: { id: true, name: true, email: true, role: true, department: true, matricNo: true } },
            attachments: { select: { id: true, filename: true, mimeType: true, size: true } },
            _count: { select: { comments: true } },
          },
          orderBy: { updatedAt: "desc" },
          take: 6,
        }),
        // avg resolution time: from created to the log when it went RESOLVED
        db.statusLog.findMany({
          where: { toStatus: "RESOLVED", request: { assignments: { some: { officerId: session.sub } } } },
          select: { createdAt: true, request: { select: { createdAt: true } } },
          orderBy: { createdAt: "desc" },
          take: 100,
        }),
      ]);

      const durations = resolvedWithTimes.map((l) => (new Date(l.createdAt).getTime() - new Date(l.request.createdAt).getTime()) / 36e5);
      const avgResolutionHours = durations.length ? Math.round((durations.reduce((a, b) => a + b, 0) / durations.length) * 10) / 10 : null;

      return ok({ assignedTotal, newAssigned, inProgress, onHold, resolvedThisMonth, avgResolutionHours, recent });
    }

    // ADMIN — organisation-wide
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [statusGroups, priorityGroups, categoryGroups, totalRequests, unassigned, totalUsers, totalOfficers, resolvedThisMonth, recentResolved, officerRows, trendGroups, recentActivity] =
      await Promise.all([
        db.serviceRequest.groupBy({ by: ["status"], _count: true }),
        db.serviceRequest.groupBy({ by: ["priority"], _count: true }),
        db.category.findMany({ include: { _count: { select: { requests: true } } }, orderBy: { name: "asc" } }),
        db.serviceRequest.count(),
        db.serviceRequest.count({ where: { status: "OPEN" } }),
        db.user.count({ where: { isActive: true } }),
        db.user.count({ where: { role: "OFFICER", isActive: true } }),
        db.serviceRequest.count({ where: { status: "RESOLVED", updatedAt: { gte: monthStart } } }),
        db.statusLog.findMany({
          where: { toStatus: "RESOLVED" },
          select: { createdAt: true, request: { select: { createdAt: true } } },
          orderBy: { createdAt: "desc" },
          take: 200,
        }),
        db.user.findMany({
          where: { role: "OFFICER", isActive: true },
          select: {
            id: true, name: true,
            assignments: { where: { isActive: true, request: { status: { in: ["ASSIGNED", "IN_PROGRESS", "ON_HOLD"] } } }, select: { id: true } },
          },
        }),
        db.serviceRequest.findMany({ where: { createdAt: { gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 180) } }, select: { createdAt: true } }),
        db.auditLog.findMany({
          include: { user: { select: { id: true, name: true, role: true } } },
          orderBy: { createdAt: "desc" },
          take: 8,
        }),
      ]);

      // resolved-with-time for officers: aggregate via logs
      const resolvedWithTimes = await db.statusLog.findMany({
        where: { toStatus: "RESOLVED" },
        select: { createdAt: true, request: { select: { createdAt: true } } },
        orderBy: { createdAt: "desc" },
        take: 200,
      });

    const byStatus = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<string, number>;
    statusGroups.forEach((g) => { byStatus[g.status] = g._count; });
    const byPriority = Object.fromEntries(PRIORITIES.map((p) => [p, 0])) as Record<string, number>;
    priorityGroups.forEach((g) => { byPriority[g.priority] = g._count; });

    const durations = resolvedWithTimes.map((l) => (new Date(l.createdAt).getTime() - new Date(l.request.createdAt).getTime()) / 36e5);
    const avgResolutionHours = durations.length ? Math.round((durations.reduce((a, b) => a + b, 0) / durations.length) * 10) / 10 : null;

    // resolved counts per officer
    const officerResolved = await db.statusLog.groupBy({
      by: ["userId"],
      where: { toStatus: "RESOLVED", user: { role: "OFFICER" } },
      _count: true,
    });

    const officerWorkload = officerRows.map((o) => ({
      id: o.id,
      name: o.name,
      active: o.assignments.length,
      resolved: officerResolved.find((r) => r.userId === o.id)?._count || 0,
    }));

    // monthly trend, last 6 months
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

    return ok({
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
    });
  } catch (err) {
    return handleApiError(err);
  }
}
