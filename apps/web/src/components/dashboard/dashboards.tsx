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
import type { PersonalStats, OfficerStats, AdminStats, RequestStatus, ServiceRequestRow } from "@/types";
import {
  FileText, CheckCircle2, PlusCircle, Wrench, Loader2, TrendingUp, FolderOpen, Zap, Kanban,
} from "@/components/icons";
import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

const STATUS_COLORS: Record<RequestStatus, string> = {
  OPEN: "#176ae5",
  ASSIGNED: "#4c48c9",
  IN_PROGRESS: "#e8602b",
  ON_HOLD: "#a9a49a",
  CLOSED: "#d8cfc1",
  RESOLVED: "#23864f",
  REJECTED: "#b3261e",
};

function deskGreeting(name: string | undefined) {
  const firstName = name?.split(/\s+/).filter((t) => !/^(mr|mrs|ms|miss|dr|prof)\.?$/i.test(t))[0] ?? "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  return { firstName, greeting };
}

function DeskHero({ greeting, firstName, headline, subline, children }: {
  greeting: string;
  firstName: string;
  headline: string;
  subline: string;
  children: React.ReactNode;
}) {
  return (
    <div className="sand flex flex-col gap-6 px-6 py-7 sm:flex-row sm:items-center sm:justify-between sm:px-9 sm:py-8">
      <div>
        <p className="text-[14px] font-medium text-muted-foreground">{greeting}, {firstName}</p>
        <h1 className="mt-1.5 text-[30px] font-semibold leading-[1.05] tracking-[-0.03em] sm:text-[34px]">{headline}</h1>
        <p className="mt-2 max-w-md text-[15px] leading-snug text-muted-foreground">{subline}</p>
      </div>
      {children}
    </div>
  );
}

function DeskItemRow({ r, withTime, onOpen, children }: {
  r: ServiceRequestRow;
  withTime?: boolean;
  onOpen: (reference: string) => void;
  children?: React.ReactNode;
}) {
  return (
    <li className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
      <button className="min-w-0 flex-1 text-left" onClick={() => onOpen(r.reference)}>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold tabular-nums text-foreground">{r.reference}</span>
          <StatusBadge status={r.status} />
          <PriorityBadge priority={r.priority} />
          {withTime && <span className="ml-auto text-[11px] text-muted-foreground">{timeAgo(r.createdAt)}</span>}
        </div>
        <p className="mt-1 truncate text-sm font-medium">{r.title}</p>
      </button>
      {children}
    </li>
  );
}

function RecentList({ loading, items, empty, children }: { loading: boolean; items: ServiceRequestRow[]; empty: React.ReactNode; children: React.ReactNode }) {
  if (loading) {
    return <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>;
  }
  if (items.length === 0) return <>{empty}</>;
  return <ul className="divide-y">{children}</ul>;
}

const METRIC_GRID_COLS = { 4: "sm:grid-cols-4", 5: "sm:grid-cols-5" } as const;

function metricValue(loading: boolean, value: number | undefined | null): string | number {
  return loading ? "…" : value ?? 0;
}

function personalCells(data: PersonalStats | null, loading: boolean) {
  return [
    { label: "My requests", value: metricValue(loading, data?.total) },
    { label: "Open / assigned", value: metricValue(loading, data?.open) },
    { label: "In progress", value: metricValue(loading, data?.inProgress) },
    { label: "Resolved", value: metricValue(loading, data?.resolved) },
  ];
}

function officerCells(data: OfficerStats | null, loading: boolean) {
  return [
    { label: "Assigned", value: metricValue(loading, data?.assignedTotal) },
    { label: "To start", value: metricValue(loading, data?.newAssigned) },
    { label: "In progress", value: metricValue(loading, data?.inProgress) },
    { label: "On hold", value: metricValue(loading, data?.onHold) },
    { label: "Resolved this month", value: metricValue(loading, data?.resolvedThisMonth), sub: data?.avgResolutionHours != null ? `~${data.avgResolutionHours}h avg` : undefined },
  ];
}

function adminCells(data: AdminStats | null, loading: boolean) {
  return [
    { label: "Total", value: metricValue(loading, data?.totalRequests) },
    { label: "Unassigned", value: metricValue(loading, data?.unassigned) },
    { label: "Resolved this month", value: metricValue(loading, data?.resolvedThisMonth), sub: data?.avgResolutionHours != null ? `~${data.avgResolutionHours}h avg` : undefined },
    { label: "Users", value: metricValue(loading, data?.totalUsers), sub: `${data?.totalOfficers ?? 0} officers` },
  ];
}

function ConfirmCloseButton({ r, onConfirm }: { r: ServiceRequestRow; onConfirm: (id: string) => void }) {
  if (r.status !== "RESOLVED") return null;
  return (
    <Button size="sm" variant="outline" onClick={() => onConfirm(r.id)}>
      <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Confirm fixed
    </Button>
  );
}

function JobActionButton({ r, marking, onStart, onOpen }: { r: ServiceRequestRow; marking: string | null; onStart: (id: string) => void; onOpen: (reference: string) => void }) {
  if (r.status === "ASSIGNED") {
    const busy = marking === r.id;
    return (
      <Button size="sm" onClick={() => onStart(r.id)} disabled={busy}>
        {busy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Zap className="mr-1.5 h-3.5 w-3.5" />}
        Start Job
      </Button>
    );
  }
  return (
    <Button size="sm" variant="outline" onClick={() => onOpen(r.reference)}>
      {r.status === "IN_PROGRESS" ? "Update Progress" : "View"}
    </Button>
  );
}

function MetricGrid({ cols = 4, cells }: { cols?: 4 | 5; cells: { label: string; value: string | number; sub?: string }[] }) {
  return (
    <div className={`grid grid-cols-2 gap-px border-b border-border bg-border ${METRIC_GRID_COLS[cols]}`}>
      {cells.map((cell) => (
        <LedgerCell key={cell.label} label={cell.label} value={cell.value} sub={cell.sub} />
      ))}
    </div>
  );
}

function personalHeadline(loading: boolean, openCount: number): string {
  if (loading) return "Loading your desk…";
  if (openCount === 0) return "Your desk is clear.";
  if (openCount === 1) return "You have 1 open request.";
  return `You have ${openCount} open requests.`;
}

function officerHeadline(loading: boolean, active: number): string {
  if (loading) return "Loading your desk…";
  if (active === 0) return "Your board is clear.";
  if (active === 1) return "1 job on your board.";
  return `${active} jobs on your board.`;
}

function selectUpNext(recent: ServiceRequestRow[] | undefined): ServiceRequestRow[] {
  return [...(recent ?? [])]
    .filter((r) => r.status === "ASSIGNED" || r.status === "IN_PROGRESS" || r.status === "ON_HOLD")
    .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))
    .slice(0, 4);
}

function buildStatusData(byStatus: AdminStats["byStatus"] | undefined) {
  if (!byStatus) return [] as { key: RequestStatus; name: string; value: number }[];
  return (Object.entries(byStatus) as [RequestStatus, number][])
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ key: k, name: formatStatus(k), value: v }));
}

const TOOLTIP_STYLE = { borderRadius: 12, border: "1px solid var(--border)", background: "var(--popover)", color: "var(--popover-foreground)", fontSize: 13 } as const;

function MonthlyTrendSection({ trend, loading }: { trend: AdminStats["monthlyTrend"] | undefined; loading: boolean }) {
  return (
    <FolioSection title="Requests per month">
      {loading ? (
        <Skeleton className="h-48 w-full" />
      ) : (
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trend || []} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-border" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="currentColor" className="text-muted-foreground" tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="currentColor" className="text-muted-foreground" tickLine={false} axisLine={false} />
              <Tooltip cursor={{ fill: "color-mix(in srgb, var(--fg) 6%, transparent)" }} contentStyle={TOOLTIP_STYLE} />
              <Bar isAnimationActive={false} dataKey="count" name="Requests" fill="var(--fg)" radius={[6, 6, 0, 0]} maxBarSize={44} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </FolioSection>
  );
}

function StatusPieSection({ statusData, loading }: { statusData: ReturnType<typeof buildStatusData>; loading: boolean }) {
  return (
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
                    <Cell key={i} fill={STATUS_COLORS[entry.key]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="grid w-full max-w-md grid-cols-2 gap-x-8 gap-y-2">
            {statusData.map((entry) => (
              <li key={entry.name} className="flex items-center gap-2 border-b border-foreground/15 pb-1.5 text-xs">
                <span className="h-2.5 w-2.5 shrink-0" style={{ background: STATUS_COLORS[entry.key] }} />
                <span className="min-w-0 flex-1 truncate text-muted-foreground">{entry.name}</span>
                <span className="tabular-nums text-foreground">{entry.value}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </FolioSection>
  );
}

function WorkloadSection({ workload, loading }: { workload: AdminStats["officerWorkload"] | undefined; loading: boolean }) {
  return (
    <FolioSection title="Officer workload" className="border-t border-foreground/15 lg:border-r lg:border-foreground/15">
      {loading ? (
        <Skeleton className="h-32 w-full" />
      ) : !workload || workload.length === 0 ? (
        <p className="py-6 text-sm text-muted-foreground">No maintenance officers yet. Create officer accounts in Manage Users.</p>
      ) : (
        <ul className="divide-y divide-foreground/10">
          {workload.map((o) => (
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
  );
}

function TopCategoriesSection({ categories, loading }: { categories: AdminStats["byCategory"] | undefined; loading: boolean }) {
  return (
    <FolioSection title="Top categories" className="border-t border-foreground/15">
      {loading ? (
        <Skeleton className="h-32 w-full" />
      ) : !categories || categories.every((c) => c.count === 0) ? (
        <p className="py-6 text-sm text-muted-foreground">No requests submitted yet.</p>
      ) : (
        <CategoryBars categories={categories} />
      )}
    </FolioSection>
  );
}

function CategoryBars({ categories }: { categories: AdminStats["byCategory"] }) {
  const max = Math.max(...categories.map((x) => x.count), 1);
  return (
    <ul className="space-y-2.5">
      {[...categories].sort((a, b) => b.count - a.count).slice(0, 5).map((c) => (
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
      ))}
    </ul>
  );
}

function RecentActivitySection({ activity, loading, onOpenAudit }: { activity: AdminStats["recentActivity"] | undefined; loading: boolean; onOpenAudit: () => void }) {
  return (
    <FolioSection title="Recent activity" action={
      <Button variant="ghost" size="sm" onClick={onOpenAudit}>Full audit trail <span aria-hidden>→</span></Button>
    } className="border-t border-foreground/15">
      {loading ? (
        <Skeleton className="h-24 w-full" />
      ) : !activity || activity.length === 0 ? (
        <p className="py-6 text-sm text-muted-foreground">No activity recorded yet.</p>
      ) : (
        <ul className="space-y-2.5">
          {activity.map((a) => (
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
  );
}

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

  const { firstName, greeting } = deskGreeting(user?.name);
  const openCount = data?.open ?? 0;
  const headline = personalHeadline(loading, openCount);

  return (
    <div className="space-y-6">
      <DeskHero greeting={greeting} firstName={firstName} headline={headline} subline="Report a fault once. It gets an owner and a finish.">
        <Button size="lg" className="shrink-0 px-7 text-[16px]" onClick={() => navigate("new-request")}>
          <PlusCircle className="mr-2 h-5 w-5" /> New Request
        </Button>
      </DeskHero>

      <Folio>
        <div className="px-4 pt-5 sm:px-6 sm:pt-6">
          <PageHeader title="Overview" description="Your requests at a glance." />
        </div>

        <MetricGrid cells={personalCells(data ?? null, loading)} />

        <FolioSection title="Recent requests" action={
          <Button variant="ghost" size="sm" onClick={() => navigate("requests")}>View all <span aria-hidden>→</span></Button>
        }>
            <RecentList
              loading={loading}
              items={data?.recent ?? []}
              empty={(
                <EmptyState
                  icon={FileText}
                  title="No requests yet"
                  description="Submit your first request. It takes a minute."
                  action={<Button onClick={() => navigate("new-request")}><PlusCircle className="mr-2 h-4 w-4" /> Submit request</Button>}
                />
              )}
            >
              {(data?.recent ?? []).map((r) => (
                <DeskItemRow key={r.id} r={r} withTime onOpen={(reference) => navigate("request-detail", reference)}>
                  <ConfirmCloseButton r={r} onConfirm={confirmClose} />
                </DeskItemRow>
              ))}
            </RecentList>
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

  const { firstName, greeting } = deskGreeting(user?.name);
  const active = (data?.newAssigned ?? 0) + (data?.inProgress ?? 0) + (data?.onHold ?? 0);
  const headline = officerHeadline(loading, active);
  const upNext = selectUpNext(data?.recent);

  return (
    <div className="space-y-6">
      <DeskHero greeting={greeting} firstName={firstName} headline={headline} subline="Pick the next one up when you're ready.">
        <Button size="lg" className="shrink-0 px-7 text-[16px]" onClick={() => navigate("board")}>
          <Kanban className="mr-2 h-5 w-5" /> Open board
        </Button>
      </DeskHero>

      <Folio>
        <div className="px-4 pt-5 sm:px-6 sm:pt-6">
          <PageHeader title="Overview" description="Your plate at a glance." />
        </div>

        <MetricGrid cols={5} cells={officerCells(data ?? null, loading)} />

        <FolioSection title="Up next" action={
          <Button variant="ghost" size="sm" onClick={() => navigate("board")}>Open board <span aria-hidden>→</span></Button>
        }>
          <RecentList
            loading={loading}
            items={upNext}
            empty={(
              <EmptyState
                icon={Wrench}
                title="Nothing on your plate"
                description="Assigned jobs will show up here."
                action={<Button variant="outline" onClick={() => navigate("board")}><Kanban className="mr-2 h-4 w-4" /> Open board</Button>}
              />
            )}
          >
              {upNext.map((r) => (
                <DeskItemRow key={r.id} r={r} onOpen={(reference) => navigate("request-detail", reference)}>
                  <JobActionButton r={r} marking={marking} onStart={start} onOpen={(reference) => navigate("request-detail", reference)} />
                </DeskItemRow>
              ))}
          </RecentList>
        </FolioSection>
      </Folio>
    </div>
  );
}


function AdminDashboard() {
  const navigate = useViewNav();
  const { data, loading } = useFetch<AdminStats>("/api/stats/admin");
  const statusData = buildStatusData(data?.byStatus);

  return (
    <Folio>
      <div className="px-4 pt-5 sm:px-6 sm:pt-6">
        <PageHeader title="Campus" description="Everything at a glance.">
          <Button variant="outline" onClick={() => navigate("reports")}>
            <TrendingUp className="mr-2 h-4 w-4" /> Reports
          </Button>
        </PageHeader>
      </div>

      <MetricGrid cells={adminCells(data ?? null, loading)} />

      <MonthlyTrendSection trend={data?.monthlyTrend} loading={loading} />

      <StatusPieSection statusData={statusData} loading={loading} />

      <div className="grid lg:grid-cols-2">
        <WorkloadSection workload={data?.officerWorkload} loading={loading} />

        <TopCategoriesSection categories={data?.byCategory} loading={loading} />
      </div>

      <RecentActivitySection activity={data?.recentActivity} loading={loading} onOpenAudit={() => navigate("audit")} />
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
