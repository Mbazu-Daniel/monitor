"use client";

import { useMemo, useState } from "react";
import { useFetch } from "@/hooks/use-fetch";
import { download } from "@/lib/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatCard, EmptyState, PageHeader, timeAgo, formatStatus } from "@/components/shared";
import type { AdminStats, RequestStatus } from "@/types";
import {
  Download, FileSpreadsheet, TrendingUp, CheckCircle2, Timer, FolderOpen, ClipboardList, Users, Loader2,
} from "@/components/icons";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const ALL_STATUSES: RequestStatus[] = ["OPEN", "ASSIGNED", "IN_PROGRESS", "ON_HOLD", "RESOLVED", "CLOSED", "REJECTED"];

const allToEmpty = (v: string) => (v === "all" ? "" : v);
const exportStatusLabel = (s: string) => (s ? formatStatus(s) : "All statuses");
const statValue = (loading: boolean, v: number | null | undefined) => (loading ? "…" : v ?? 0);
const avgResolutionValue = (loading: boolean, input: AdminStats | null) =>
  loading ? "…" : input?.avgResolutionHours != null ? `${input.avgResolutionHours}h` : "…";

function statCards(data: AdminStats | null, loading: boolean) {
  return [
    { title: "Total Requests", value: statValue(loading, data?.totalRequests), icon: ClipboardList },
    { title: "Resolved this month", value: statValue(loading, data?.resolvedThisMonth), icon: CheckCircle2 },
    { title: "Avg. Resolution", value: avgResolutionValue(loading, data), icon: Timer, sub: "From submission to resolved" },
    { title: "Users", value: statValue(loading, data?.totalUsers), icon: Users, sub: `${data?.totalOfficers ?? 0} officers` },
  ];
}

function recentActivitySummary(activity: AdminStats["recentActivity"] | undefined): string {
  const latest = activity?.[0];
  if (!latest) return "no activity yet";
  return `${latest.details || latest.action} (${timeAgo(latest.createdAt)})`;
}

async function downloadCsv(status: string): Promise<void> {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  const blob = await download(`/api/export/requests${params.toString() ? `?${params}` : ""}`);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `mivacampus-requests-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function ExportButton({ exporting, onExport }: { exporting: boolean; onExport: () => void }) {
  return (
    <Button onClick={onExport} disabled={exporting}>
      {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}
      Export CSV
    </Button>
  );
}

function TrendCard({ trend, loading }: { trend: AdminStats["monthlyTrend"]; loading: boolean }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">Monthly submission trend</CardTitle></CardHeader>
      <CardContent className="h-60">
        {loading ? <Skeleton className="h-full w-full" /> : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trend} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-border" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} className="text-muted-foreground" tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} className="text-muted-foreground" tickLine={false} axisLine={false} />
              <Tooltip cursor={{ fill: "color-mix(in srgb, var(--fg) 6%, transparent)" }} contentStyle={{ borderRadius: 10, fontSize: 13 }} />
              <Bar isAnimationActive={false} dataKey="count" name="Requests" fill="var(--fg)" radius={[6, 6, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

function OfficerPerformanceCard({ workload, loading }: { workload: AdminStats["officerWorkload"] | undefined; loading: boolean }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">Officer performance</CardTitle></CardHeader>
      <CardContent>
        {loading ? <Skeleton className="h-40 w-full" /> : !workload || workload.length === 0 ? (
          <EmptyState icon={TrendingUp} title="No officers yet" description="Create officer accounts to see workload metrics." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs  text-muted-foreground">
                  <th className="py-2 font-medium">Officer</th>
                  <th className="py-2 text-right font-medium">Active Jobs</th>
                  <th className="py-2 text-right font-medium">Resolved (all time)</th>
                </tr>
              </thead>
              <tbody>
                {workload.map((o) => (
                  <tr key={o.id} className="border-b last:border-0">
                    <td className="py-2.5 font-medium">{o.name}</td>
                    <td className="py-2.5 text-right tabular-nums">{o.active}</td>
                    <td className="py-2.5 text-right tabular-nums">{o.resolved}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CategoryCard({ categories, loading }: { categories: AdminStats["byCategory"] | undefined; loading: boolean }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">Requests by category</CardTitle>
        <Download className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? <Skeleton className="h-32 w-full" /> : !categories || categories.every((c) => c.count === 0) ? (
          <EmptyState icon={FolderOpen} title="No requests yet" />
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {[...categories].sort((a, b) => b.count - a.count).map((c) => (
              <div key={c.name} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <span className="truncate font-medium">{c.name}</span>
                <span className="rounded-md bg-accent px-2 py-0.5 text-xs font-semibold text-foreground tabular-nums  dark:text-foreground">{c.count}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ReportsView() {
  const { data, loading } = useFetch<AdminStats>("/api/stats/admin");
  const [exportStatus, setExportStatus] = useState("");
  const [exporting, setExporting] = useState(false);

  const trendData = useMemo(() => data?.monthlyTrend || [], [data]);

  async function exportCsv() {
    setExporting(true);
    try {
      await downloadCsv(exportStatus);
      toast.success("CSV report downloaded.");
    } catch {
      toast.error("Could not export the report. Please try again.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Reports & Export" description="Operational metrics and downloadable CSV reports for management.">
        <div className="flex items-center gap-2">
          <Select value={exportStatus || "all"} onValueChange={(v) => setExportStatus(allToEmpty(v))}>
            <SelectTrigger className="w-44" aria-label="Export filter status"><SelectValue>{exportStatusLabel(exportStatus)}</SelectValue></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {ALL_STATUSES.map((s) => <SelectItem key={s} value={s}>{formatStatus(s)}</SelectItem>)}
            </SelectContent>
          </Select>
          <ExportButton exporting={exporting} onExport={() => void exportCsv()} />
        </div>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards(data ?? null, loading).map((card) => (
          <StatCard key={card.title} title={card.title} value={card.value} icon={card.icon} sub={card.sub} />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <TrendCard trend={trendData} loading={loading} />
        <OfficerPerformanceCard workload={data?.officerWorkload} loading={loading} />
      </div>

      <CategoryCard categories={data?.byCategory} loading={loading} />

      <p className="text-center text-xs text-muted-foreground">
        Every action in the system is recorded. See the Audit Trail page. Recent: {recentActivitySummary(data?.recentActivity)}.
      </p>
    </div>
  );
}
