"use client";

import { useState } from "react";
import { useFetch } from "@/hooks/use-fetch";
import { useAppStore } from "@/stores/app-store";
import { api } from "@/lib/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  StatusBadge, PriorityBadge, CategoryIcon, timeAgo, EmptyState, PageHeader, formatStatus,
} from "@/components/shared";
import { Folio, FolioSection } from "@/components/shared/folio";
import { useViewNav } from "@/lib/view-nav";
import type { PersonalStats, OfficerStats, AdminStats, RequestStatus } from "@/types";
import {
  FileText, CheckCircle2, PlusCircle, Wrench, Loader2, TrendingUp, FolderOpen, Zap, Kanban,
} from "@/components/icons";
import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

const STATUS_COLORS: Record<string, string> = {
  OPEN: "#176ae5",
  ASSIGNED: "#4c48c9",
  IN_PROGRESS: "#e8602b",
  ON_HOLD: "#a9a49a",
  CLOSED: "#d8cfc1",
  RESOLVED: "#23864f",
  REJECTED: "#b3261e",
};

export function DashboardView() {
  const { user } = useAppStore();
  if (!user) return null;
  if (user.role === "ADMIN") return <AdminDashboard />;
  if (user.role === "OFFICER") return <OfficerDashboard />;
  return <PersonalDashboard />;
}



function PersonalDashboard() {
  const navigate = useViewNav();
  const { user } = useAppStore();
  const { data, loading, refetch } = useFetch<PersonalStats>("/api/stats/personal");

  async function confirmClose(id: string) {
    try {
      await api(`/api/requests/${id}/status`, { method: "POST", body: JSON.stringify({ status: "CLOSED", note: "Confirmed fixed by requester" }) });
      toast.success("Request closed. Thanks for confirming.");
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to close request");
    }
  }

  const firstName = user?.name?.split(/\s+/).filter((t) => !/^(mr|mrs|ms|miss|dr|prof)\.?$/i.test(t))[0] ?? "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const openCount = data?.open ?? 0;
  const headline = loading
    ? "Loading your desk…"
    : openCount === 0
      ? "Your desk is clear."
      : openCount === 1
        ? "You have 1 open request."
        : `You have ${openCount} open requests.`;

  return (
    <div className="space-y-6">
      <div className="sand flex flex-col gap-6 px-6 py-7 sm:flex-row sm:items-center sm:justify-between sm:px-9 sm:py-8">
        <div>
          <p className="text-[14px] font-medium text-muted-foreground">{greeting}, {firstName}</p>
          <h1 className="mt-1.5 text-[30px] font-semibold leading-[1.05] tracking-[-0.03em] sm:text-[34px]">{headline}</h1>
          <p className="mt-2 max-w-md text-[15px] leading-snug text-muted-foreground">Report a fault once. It gets an owner and a finish.</p>
        </div>
        <Button size="lg" className="shrink-0 px-7 text-[16px]" onClick={() => navigate("new-request")}>
          <PlusCircle className="mr-2 h-5 w-5" /> New Request
        </Button>
      </div>

      <Folio>
        <div className="px-4 pt-5 sm:px-6 sm:pt-6">
          <PageHeader title="Overview" description="Your requests at a glance." />
        </div>

        <div className="grid grid-cols-2 gap-px border-b border-border bg-border sm:grid-cols-4">
          <LedgerCell label="My requests" value={loading ? "…" : data?.total ?? 0} />
          <LedgerCell label="Open / assigned" value={loading ? "…" : data?.open ?? 0} />
          <LedgerCell label="In progress" value={loading ? "…" : data?.inProgress ?? 0} />
          <LedgerCell label="Resolved" value={loading ? "…" : data?.resolved ?? 0} />
        </div>

        <FolioSection title="Recent requests" action={
          <Button variant="ghost" size="sm" onClick={() => navigate("requests")}>View all <span aria-hidden>→</span></Button>
        }>
            {loading ? (
              <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
            ) : !data || data.recent.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No requests yet"
                description="Submit your first request. It takes a minute."
                action={<Button onClick={() => navigate("new-request")}><PlusCircle className="mr-2 h-4 w-4" /> Submit request</Button>}
              />
            ) : (
              <ul className="divide-y">
                {data.recent.map((r) => (
                  <li key={r.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <button className="min-w-0 flex-1 text-left" onClick={() => navigate("request-detail", r.reference)}>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold tabular-nums text-foreground">{r.reference}</span>
                        <StatusBadge status={r.status} />
                        <PriorityBadge priority={r.priority} />
                        <span className="ml-auto text-[11px] text-muted-foreground">{timeAgo(r.createdAt)}</span>
                      </div>
                      <p className="mt-1 truncate text-sm font-medium">{r.title}</p>
                    </button>
                    {r.status === "RESOLVED" && (
                      <Button size="sm" variant="outline" onClick={() => confirmClose(r.id)}>
                        <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Confirm fixed
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
        </FolioSection>
      </Folio>
    </div>
  );
}


function OfficerDashboard() {
  const navigate = useViewNav();
  const { user } = useAppStore();
  const { data, loading, refetch } = useFetch<OfficerStats>("/api/stats/officer");
  const [marking, setMarking] = useState<string | null>(null);

  async function start(id: string) {
    setMarking(id);
    try {
      await api(`/api/requests/${id}/status`, { method: "POST", body: JSON.stringify({ status: "IN_PROGRESS" }) });
      toast.success("Job started. Status is now in progress.");
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update status");
    } finally {
      setMarking(null);
    }
  }

  const firstName = user?.name?.split(/\s+/).filter((t) => !/^(mr|mrs|ms|miss|dr|prof)\.?$/i.test(t))[0] ?? "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const active = (data?.newAssigned ?? 0) + (data?.inProgress ?? 0) + (data?.onHold ?? 0);
  const headline = loading
    ? "Loading your desk…"
    : active === 0
      ? "Your board is clear."
      : active === 1
        ? "1 job on your board."
        : `${active} jobs on your board.`;

  const upNext = [...(data?.recent ?? [])]
    .filter((r) => r.status === "ASSIGNED" || r.status === "IN_PROGRESS" || r.status === "ON_HOLD")
    .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))
    .slice(0, 4);

  return (
    <div className="space-y-6">
      <div className="sand flex flex-col gap-6 px-6 py-7 sm:flex-row sm:items-center sm:justify-between sm:px-9 sm:py-8">
        <div>
          <p className="text-[14px] font-medium text-muted-foreground">{greeting}, {firstName}</p>
          <h1 className="mt-1.5 text-[30px] font-semibold leading-[1.05] tracking-[-0.03em] sm:text-[34px]">{headline}</h1>
          <p className="mt-2 max-w-md text-[15px] leading-snug text-muted-foreground">Pick the next one up when you&apos;re ready.</p>
        </div>
        <Button size="lg" className="shrink-0 px-7 text-[16px]" onClick={() => navigate("board")}>
          <Kanban className="mr-2 h-5 w-5" /> Open board
        </Button>
      </div>

      <Folio>
        <div className="px-4 pt-5 sm:px-6 sm:pt-6">
          <PageHeader title="Overview" description="Your plate at a glance." />
        </div>

        <div className="grid grid-cols-2 gap-px border-b border-border bg-border sm:grid-cols-5">
          <LedgerCell label="Assigned" value={loading ? "…" : data?.assignedTotal ?? 0} />
          <LedgerCell label="To start" value={loading ? "…" : data?.newAssigned ?? 0} />
          <LedgerCell label="In progress" value={loading ? "…" : data?.inProgress ?? 0} />
          <LedgerCell label="On hold" value={loading ? "…" : data?.onHold ?? 0} />
          <LedgerCell label="Resolved this month" value={loading ? "…" : data?.resolvedThisMonth ?? 0} sub={data?.avgResolutionHours != null ? `~${data.avgResolutionHours}h avg` : undefined} />
        </div>

        <FolioSection title="Up next" action={
          <Button variant="ghost" size="sm" onClick={() => navigate("board")}>Open board <span aria-hidden>→</span></Button>
        }>
          {loading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : upNext.length === 0 ? (
            <EmptyState
              icon={Wrench}
              title="Nothing on your plate"
              description="Assigned jobs will show up here."
              action={<Button variant="outline" onClick={() => navigate("board")}><Kanban className="mr-2 h-4 w-4" /> Open board</Button>}
            />
          ) : (
            <ul className="divide-y">
              {upNext.map((r) => (
                <li key={r.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <button className="min-w-0 flex-1 text-left" onClick={() => navigate("request-detail", r.reference)}>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold tabular-nums text-foreground">{r.reference}</span>
                      <StatusBadge status={r.status} />
                      <PriorityBadge priority={r.priority} />
                    </div>
                    <p className="mt-1 truncate text-sm font-medium">{r.title}</p>
                  </button>
                  {r.status === "ASSIGNED" ? (
                    <Button size="sm" onClick={() => start(r.id)} disabled={marking === r.id}>
                      {marking === r.id ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Zap className="mr-1.5 h-3.5 w-3.5" />}
                      Start Job
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => navigate("request-detail", r.reference)}>
                      {r.status === "IN_PROGRESS" ? "Update Progress" : "View"}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </FolioSection>
      </Folio>
    </div>
  );
}


function AdminDashboard() {
  const navigate = useViewNav();
  const { data, loading } = useFetch<AdminStats>("/api/stats/admin");

  const statusData = data
    ? (Object.entries(data.byStatus) as [RequestStatus, number][])
        .filter(([, v]) => v > 0)
        .map(([k, v]) => ({ key: k, name: formatStatus(k), value: v }))
    : [];

  return (
    <Folio>
      <div className="px-4 pt-5 sm:px-6 sm:pt-6">
        <PageHeader title="Campus" description="Everything at a glance.">
          <Button variant="outline" onClick={() => navigate("reports")}>
            <TrendingUp className="mr-2 h-4 w-4" /> Reports
          </Button>
        </PageHeader>
      </div>

      <div className="grid grid-cols-2 gap-px border-b border-border bg-border sm:grid-cols-4">
        <LedgerCell label="Total" value={loading ? "…" : data?.totalRequests ?? 0} />
        <LedgerCell label="Unassigned" value={loading ? "…" : data?.unassigned ?? 0} />
        <LedgerCell label="Resolved this month" value={loading ? "…" : data?.resolvedThisMonth ?? 0} sub={data?.avgResolutionHours != null ? `~${data.avgResolutionHours}h avg` : undefined} />
        <LedgerCell label="Users" value={loading ? "…" : data?.totalUsers ?? 0} sub={`${data?.totalOfficers ?? 0} officers`} />
      </div>

      <FolioSection title="Requests per month">
        {loading ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.monthlyTrend || []} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-border" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="currentColor" className="text-muted-foreground" tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="currentColor" className="text-muted-foreground" tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: "color-mix(in srgb, var(--fg) 6%, transparent)" }} contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--popover)", color: "var(--popover-foreground)", fontSize: 13 }} />
                <Bar isAnimationActive={false} dataKey="count" name="Requests" fill="var(--fg)" radius={[6, 6, 0, 0]} maxBarSize={44} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </FolioSection>

      <FolioSection title="By status" className="border-t border-foreground/15">
        {loading ? (
          <Skeleton className="h-44 w-full" />
        ) : statusData.length === 0 ? (
          <EmptyState icon={FolderOpen} title="No requests yet" />
        ) : (
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-10">
            <div className="h-44 w-64 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie isAnimationActive={false} data={statusData} dataKey="value" nameKey="name" innerRadius={44} outerRadius={66} paddingAngle={3} strokeWidth={0}>
                    {statusData.map((entry, i) => (
                      <Cell key={i} fill={STATUS_COLORS[entry.key] || "#57534e"} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--popover)", color: "var(--popover-foreground)", fontSize: 13 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="grid w-full max-w-md grid-cols-2 gap-x-8 gap-y-2">
              {statusData.map((entry) => (
                <li key={entry.name} className="flex items-center gap-2 border-b border-foreground/15 pb-1.5 text-xs">
                  <span className="h-2.5 w-2.5 shrink-0" style={{ background: STATUS_COLORS[entry.key] || "#57534e" }} />
                  <span className="min-w-0 flex-1 truncate text-muted-foreground">{entry.name}</span>
                  <span className="tabular-nums text-foreground">{entry.value}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </FolioSection>

      <div className="grid lg:grid-cols-2">
        <FolioSection title="Officer workload" className="border-t border-foreground/15 lg:border-r lg:border-foreground/15">
          {loading ? (
            <Skeleton className="h-32 w-full" />
          ) : !data || data.officerWorkload.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">No maintenance officers yet. Create officer accounts in Manage Users.</p>
          ) : (
            <ul className="divide-y divide-foreground/10">
              {data.officerWorkload.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="min-w-0 truncate font-medium">{o.name}</span>
                  <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                    <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-medium text-foreground/80">{o.active} active</span>
                    <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-medium text-foreground/80">{o.resolved} resolved</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </FolioSection>

        <FolioSection title="Top categories" className="border-t border-foreground/15">
          {loading ? (
            <Skeleton className="h-32 w-full" />
          ) : !data || data.byCategory.every((c) => c.count === 0) ? (
            <p className="py-6 text-sm text-muted-foreground">No requests submitted yet.</p>
          ) : (
            <ul className="space-y-2.5">
              {[...data.byCategory].sort((a, b) => b.count - a.count).slice(0, 5).map((c) => {
                const max = Math.max(...data.byCategory.map((x) => x.count), 1);
                return (
                  <li key={c.name} className="flex items-center gap-3 text-sm">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-foreground">
                      <CategoryIcon icon={c.icon} className="h-3.5 w-3.5" />
                    </span>
                    <span className="w-40 shrink-0 truncate sm:w-48">{c.name}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                      <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${(c.count / max) * 100}%` }} />
                    </div>
                    <span className="w-8 shrink-0 text-right text-xs font-semibold tabular-nums">{c.count}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </FolioSection>
      </div>

      <FolioSection title="Recent activity" action={
        <Button variant="ghost" size="sm" onClick={() => navigate("audit")}>Full audit trail <span aria-hidden>→</span></Button>
      } className="border-t border-foreground/15">
        {loading ? (
          <Skeleton className="h-24 w-full" />
        ) : !data || data.recentActivity.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">No activity recorded yet.</p>
        ) : (
          <ul className="space-y-2.5">
            {data.recentActivity.map((a) => (
              <li key={a.id} className="flex items-start gap-3 text-sm">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-foreground/40" />
                <div className="min-w-0 flex-1">
                  <p className="truncate">{a.details || a.action}</p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(a.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </FolioSection>
    </Folio>
  );
}

function LedgerCell({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-card p-4 sm:p-5">
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p className="mt-1.5 text-[28px] font-semibold leading-none tracking-tight tabular-nums">{value}</p>
      {sub ? <p className="mt-1.5 truncate text-[11px] text-muted-foreground">{sub}</p> : null}
    </div>
  );
}
