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

export function ReportsView() {
  const { data, loading } = useFetch<AdminStats>("/api/stats/admin");
  const [exportStatus, setExportStatus] = useState("");
  const [exporting, setExporting] = useState(false);

  const trendData = useMemo(() => data?.monthlyTrend || [], [data]);

  async function exportCsv() {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (exportStatus) params.set("status", exportStatus);
      const blob = await download(`/api/export/requests${params.toString() ? `?${params}` : ""}`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mivacampus-requests-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
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
          <Select value={exportStatus || "all"} onValueChange={(v) => setExportStatus(v === "all" ? "" : v)}>
            <SelectTrigger className="w-44" aria-label="Export filter status"><SelectValue>{exportStatus ? formatStatus(exportStatus) : "All statuses"}</SelectValue></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {ALL_STATUSES.map((s) => <SelectItem key={s} value={s}>{formatStatus(s)}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={exportCsv} disabled={exporting}>
            {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}
            Export CSV
          </Button>
        </div>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Requests" value={loading ? "…" : data?.totalRequests ?? 0} icon={ClipboardList} />
        <StatCard title="Resolved this month" value={loading ? "…" : data?.resolvedThisMonth ?? 0} icon={CheckCircle2} />
        <StatCard title="Avg. Resolution" value={loading ? "…" : data?.avgResolutionHours != null ? `${data.avgResolutionHours}h` : "…"} icon={Timer} sub="From submission to resolved" />
        <StatCard title="Users" value={loading ? "…" : data?.totalUsers ?? 0} icon={Users} sub={`${data?.totalOfficers ?? 0} officers`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Monthly submission trend</CardTitle></CardHeader>
          <CardContent className="h-60">
            {loading ? <Skeleton className="h-full w-full" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
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

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Officer performance</CardTitle></CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-40 w-full" /> : !data || data.officerWorkload.length === 0 ? (
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
                    {data.officerWorkload.map((o) => (
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
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Requests by category</CardTitle>
          <Download className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {loading ? <Skeleton className="h-32 w-full" /> : !data || data.byCategory.every((c) => c.count === 0) ? (
            <EmptyState icon={FolderOpen} title="No requests yet" />
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {[...data.byCategory].sort((a, b) => b.count - a.count).map((c) => (
                <div key={c.name} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                  <span className="truncate font-medium">{c.name}</span>
                  <span className="rounded-md bg-accent px-2 py-0.5 text-xs font-semibold text-foreground tabular-nums  dark:text-foreground">{c.count}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        Every action in the system is recorded. See the Audit Trail page. Recent: {data?.recentActivity?.[0] ? `${data.recentActivity[0].details || data.recentActivity[0].action} (${timeAgo(data.recentActivity[0].createdAt)})` : "no activity yet"}.
      </p>
    </div>
  );
}
