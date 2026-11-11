"use client";

import { useState } from "react";
import { useFetch } from "@/hooks/use-fetch";
import { useAppStore } from "@/stores/app-store";
import { api } from "@/lib/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  StatCard, StatusBadge, PriorityBadge, CategoryIcon, timeAgo, EmptyState, PageHeader,
} from "@/components/maintenance/shared";
import type { PersonalStats, OfficerStats, AdminStats, RequestStatus } from "@/types";
import {
  FileText, Clock, CheckCircle2, Inbox, PlusCircle, Wrench, Loader2, TrendingUp, Users, FolderOpen, AlertTriangle, Zap,
} from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

const STATUS_COLORS: Record<string, string> = {
  OPEN: "#94a3b8",
  ASSIGNED: "#f59e0b",
  IN_PROGRESS: "#14b8a6",
  ON_HOLD: "#f97316",
  RESOLVED: "#10b981",
  CLOSED: "#a1a1aa",
  REJECTED: "#ef4444",
};

export function DashboardView() {
  const { user } = useAppStore();
  if (!user) return null;
  if (user.role === "ADMIN") return <AdminDashboard />;
  if (user.role === "OFFICER") return <OfficerDashboard />;
  return <PersonalDashboard />;
}

// ---------------- Student / Staff ----------------

function PersonalDashboard() {
  const { user, navigate } = useAppStore();
  const { data, loading, refetch } = useFetch<PersonalStats>("/api/stats");

  async function confirmClose(id: string) {
    try {
      await api(`/api/requests/${id}/status`, { method: "POST", body: JSON.stringify({ status: "CLOSED", note: "Confirmed fixed by requester" }) });
      toast.success("Request closed. Thanks for confirming!");
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to close request");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Hello, ${user?.name.split(" ")[0]}`}
        description="Here is an overview of your maintenance requests."
      >
        <Button onClick={() => navigate("new-request")}>
          <PlusCircle className="mr-2 h-4 w-4" /> New Request
        </Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="My Requests" value={loading ? "—" : data?.total ?? 0} icon={FileText} tone="emerald" />
        <StatCard title="Open / Assigned" value={loading ? "—" : data?.open ?? 0} icon={Inbox} tone="amber" sub="Awaiting work to start" />
        <StatCard title="In Progress" value={loading ? "—" : data?.inProgress ?? 0} icon={Clock} tone="teal" sub="Being worked on" />
        <StatCard title="Resolved / Closed" value={loading ? "—" : data?.resolved ?? 0} icon={CheckCircle2} tone="zinc" sub="Completed jobs" />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Recent requests</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate("requests")}>
            View all <span aria-hidden>→</span>
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : !data || data.recent.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No requests yet"
              description="When something on campus needs fixing — electricity, plumbing, furniture, internet — submit a request and track it here."
              action={<Button onClick={() => navigate("new-request")}><PlusCircle className="mr-2 h-4 w-4" /> Submit your first request</Button>}
            />
          ) : (
            <ul className="divide-y">
              {data.recent.map((r) => (
                <li key={r.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <button className="min-w-0 flex-1 text-left" onClick={() => navigate("request-detail", r.id)}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400">{r.reference}</span>
                      <StatusBadge status={r.status} />
                      <PriorityBadge priority={r.priority} />
                    </div>
                    <p className="mt-1 truncate text-sm font-medium">{r.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.category.name} · {r.location} · submitted {timeAgo(r.createdAt)}
                    </p>
                  </button>
                  {r.status === "RESOLVED" && (
                    <Button size="sm" variant="outline" onClick={() => confirmClose(r.id)}>
                      <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Confirm Fixed
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------- Officer ----------------

function OfficerDashboard() {
  const { user, navigate } = useAppStore();
  const { data, loading, refetch } = useFetch<OfficerStats>("/api/stats");
  const [marking, setMarking] = useState<string | null>(null);

  async function start(id: string) {
    setMarking(id);
    try {
      await api(`/api/requests/${id}/status`, { method: "POST", body: JSON.stringify({ status: "IN_PROGRESS" }) });
      toast.success("Job started — status is now In Progress.");
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update status");
    } finally {
      setMarking(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Work board, ${user?.name.split(" ")[0]}`}
        description="Requests assigned to you. Update progress and mark jobs complete."
      >
        <Button onClick={() => navigate("requests")}>
          <Wrench className="mr-2 h-4 w-4" /> View All Jobs
        </Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard title="Total Assigned" value={loading ? "—" : data?.assignedTotal ?? 0} icon={FileText} tone="emerald" />
        <StatCard title="New (to start)" value={loading ? "—" : data?.newAssigned ?? 0} icon={Inbox} tone="amber" />
        <StatCard title="In Progress" value={loading ? "—" : data?.inProgress ?? 0} icon={Clock} tone="teal" />
        <StatCard title="On Hold" value={loading ? "—" : data?.onHold ?? 0} icon={AlertTriangle} tone="red" />
        <StatCard title="Resolved (month)" value={loading ? "—" : data?.resolvedThisMonth ?? 0} icon={CheckCircle2} tone="zinc" sub={data?.avgResolutionHours != null ? `Avg ${data.avgResolutionHours}h to resolve` : undefined} />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Active jobs</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : !data || data.recent.length === 0 ? (
            <EmptyState
              icon={Wrench}
              title="No active assignments"
              description="When an administrator assigns a request to you, it will appear here with a notification."
            />
          ) : (
            <ul className="divide-y">
              {data.recent.map((r) => (
                <li key={r.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <button className="min-w-0 flex-1 text-left" onClick={() => navigate("request-detail", r.id)}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400">{r.reference}</span>
                      <StatusBadge status={r.status} />
                      <PriorityBadge priority={r.priority} />
                    </div>
                    <p className="mt-1 truncate text-sm font-medium">{r.title}</p>
                    <p className="text-xs text-muted-foreground">{r.category.name} · {r.location} · by {r.creator.name} · updated {timeAgo(r.updatedAt)}</p>
                  </button>
                  {r.status === "ASSIGNED" && (
                    <Button size="sm" onClick={() => start(r.id)} disabled={marking === r.id}>
                      {marking === r.id ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Zap className="mr-1.5 h-3.5 w-3.5" />}
                      Start Job
                    </Button>
                  )}
                  {r.status === "IN_PROGRESS" && (
                    <Button size="sm" variant="outline" onClick={() => navigate("request-detail", r.id)}>
                      Update Progress
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------- Admin ----------------

function AdminDashboard() {
  const { navigate } = useAppStore();
  const { data, loading } = useFetch<AdminStats>("/api/stats");

  const statusData = data
    ? (Object.entries(data.byStatus) as [RequestStatus, number][])
        .filter(([, v]) => v > 0)
        .map(([k, v]) => ({ name: k.replace(/_/g, " "), value: v }))
    : [];

  return (
    <div className="space-y-6">
      <PageHeader title="Administrator Overview" description="Campus-wide maintenance activity at a glance.">
        <Button variant="outline" onClick={() => navigate("reports")}>
          <TrendingUp className="mr-2 h-4 w-4" /> Reports & Export
        </Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Requests" value={loading ? "—" : data?.totalRequests ?? 0} icon={FileText} tone="emerald" />
        <StatCard title="Unassigned (Open)" value={loading ? "—" : data?.unassigned ?? 0} icon={Inbox} tone="amber" sub="Waiting for assignment" />
        <StatCard title="Resolved (month)" value={loading ? "—" : data?.resolvedThisMonth ?? 0} icon={CheckCircle2} tone="teal" sub={data?.avgResolutionHours != null ? `Avg ${data.avgResolutionHours}h` : undefined} />
        <StatCard title="Active Users" value={loading ? "—" : data?.totalUsers ?? 0} icon={Users} tone="violet" sub={`${data?.totalOfficers ?? 0} maintenance officers`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Monthly trend */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Requests per month (6 months)</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {loading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.monthlyTrend || []} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="currentColor" className="text-muted-foreground" tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="currentColor" className="text-muted-foreground" tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: "rgba(16,185,129,0.08)" }} contentStyle={{ borderRadius: 10, border: "1px solid var(--border)", background: "var(--popover)", color: "var(--popover-foreground)", fontSize: 13 }} />
                  <Bar dataKey="count" name="Requests" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={44} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Status distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">By status</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {loading ? (
              <Skeleton className="h-full w-full" />
            ) : statusData.length === 0 ? (
              <EmptyState icon={FolderOpen} title="No requests yet" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={3} strokeWidth={0}>
                    {statusData.map((entry, i) => (
                      <Cell key={i} fill={STATUS_COLORS[entry.name.replace(/ /g, "_")] || "#10b981"} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid var(--border)", background: "var(--popover)", color: "var(--popover-foreground)", fontSize: 13 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Officer workload */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Officer workload</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-32 w-full" />
            ) : !data || data.officerWorkload.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No maintenance officers yet. Create officer accounts in Manage Users.</p>
            ) : (
              <ul className="space-y-3">
                {data.officerWorkload.map((o) => (
                  <li key={o.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate font-medium">{o.name}</span>
                    <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">{o.active} active</span>
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">{o.resolved} resolved</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Top categories */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Top categories</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-32 w-full" />
            ) : !data || data.byCategory.every((c) => c.count === 0) ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No requests submitted yet.</p>
            ) : (
              <ul className="space-y-2.5">
                {[...data.byCategory].sort((a, b) => b.count - a.count).slice(0, 5).map((c) => {
                  const max = Math.max(...data.byCategory.map((x) => x.count), 1);
                  return (
                    <li key={c.name} className="flex items-center gap-3 text-sm">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                        <CategoryIcon icon={c.icon} className="h-3.5 w-3.5" />
                      </span>
                      <span className="w-28 shrink-0 truncate sm:w-36">{c.name}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(c.count / max) * 100}%` }} />
                      </div>
                      <span className="w-8 shrink-0 text-right text-xs font-semibold tabular-nums">{c.count}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent activity */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Recent activity</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate("audit")}>Full audit trail <span aria-hidden>→</span></Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-24 w-full" />
          ) : !data || data.recentActivity.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No activity recorded yet.</p>
          ) : (
            <ul className="space-y-2.5">
              {data.recentActivity.map((a) => (
                <li key={a.id} className="flex items-start gap-3 text-sm">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate">{a.details || a.action}</p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(a.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
