"use client";

import { useEffect, useMemo, useState } from "react";
import { useFetch } from "@/hooks/use-fetch";
import { useCampusEvents } from "@/hooks/use-campus-events";
import { useAppStore } from "@/stores/app-store";
import { qs } from "@/lib/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  StatusBadge, PriorityBadge, EmptyState, PageHeader, timeAgo, CategoryIcon, formatStatus,
} from "@/components/shared";
import type { Category, Paginated, ServiceRequestRow } from "@/types";
import { useViewNav } from "@/lib/view-nav";
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import {
  Search, FileText, PlusCircle, RotateCcw, ChevronLeft, ChevronRight, ImageIcon, MessageSquare, Inbox,
} from "@/components/icons";

const STATUS_LABELS: Record<string, string> = {
  OPEN: "Open",
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In progress",
  ON_HOLD: "On hold",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
  REJECTED: "Rejected",
};

const SORT_LABELS: Record<string, string> = {
  newest: "Newest first",
  oldest: "Oldest first",
  priority: "By priority",
};

const routeApi = getRouteApi("/$orgSlug/requests/");

export function RequestsListView() {
  const user = useAppStore((s) => s.user);
  const navigate = useViewNav();
  const search = routeApi.useSearch();
  const routeNavigate = useNavigate({ from: "/$orgSlug/requests/" });

  const q = search.q ?? "";
  const status = search.status ?? "";
  const priority = search.priority ?? "";
  const categoryId = search.categoryId ?? "";
  const sort = search.sort ?? "newest";
  const page = search.page ?? 1;

  const [searchInput, setSearchInput] = useState(q);

  useEffect(() => {
    setSearchInput(q);
  }, [q]);

  const filters = { search: q, status, priority, categoryId, sort };
  const hasFilters = Boolean(q || status || priority || categoryId);

  function updateSearch(patch: Partial<{ q: string; status: string; priority: string; categoryId: string; sort: "newest" | "oldest" | "priority"; page: number }>) {
    routeNavigate({
      search: (prev) => {
        const next = { ...prev, ...patch };
        for (const key of ["q", "status", "priority", "categoryId", "sort", "page"] as const) {
          if (next[key] === "" || next[key] === undefined) delete next[key];
        }
        if (next.sort === "newest") delete next.sort;
        return next;
      },
      replace: true,
    });
  }

  function setPage(nextPage: number) {
    routeNavigate({ search: (prev) => ({ ...prev, page: nextPage <= 1 ? undefined : nextPage }), replace: true });
  }

  function reset() {
    setSearchInput("");
    routeNavigate({ search: () => ({}), replace: true });
  }

  const { data: categories } = useFetch<{ categories: Category[] }>("/api/categories");
  const query = useMemo(
    () => qs({ ...filters, page, pageSize: 8 }),
    [q, status, priority, categoryId, sort, page]
  );
  const { data, loading, error, refetch } = useFetch<Paginated<ServiceRequestRow>>(`/api/requests${query}`);

  useCampusEvents((event) => {
    refetch();
    if (event.actorId === user?.id) return;
    const detail = event.type === "REQUEST_STATUS_CHANGED" && event.detail ? ` (${event.detail.split(" → ").map((s) => formatStatus(s.trim())).join(" → ")})` : "";
    toast.message(`${event.reference}${detail}`, { description: `${event.actorName} · ${event.title}` });
  });

  useEffect(() => {
    const t = setTimeout(() => {
      if (searchInput !== q) {
        updateSearch({ q: searchInput, page: undefined });
      }
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput, q]);

  const isStudent = user?.role === "STUDENT" || user?.role === "STAFF";

  const listTitle = user?.role === "ADMIN" ? "All Requests" : user?.role === "OFFICER" ? "Assigned Jobs" : "My Requests";
  const listDesc =
    user?.role === "ADMIN"
      ? "Every maintenance request across campus. Search, filter and manage."
      : user?.role === "OFFICER"
        ? "Jobs assigned to you. Open a job to update progress."
        : "Requests you have submitted and their current status.";

  return (
    <div className="space-y-5">
      <PageHeader title={listTitle} description={listDesc}>
        <Button onClick={() => navigate("new-request")}>
          <PlusCircle className="mr-2 h-4 w-4" /> New Request
        </Button>
      </PageHeader>

      <Card className="py-0">
        <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by reference, title, location…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              aria-label="Search requests"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Select value={status || "all"} onValueChange={(v) => updateSearch({ status: v === "all" ? "" : v, page: undefined })}>
              <SelectTrigger className="w-full" aria-label="Filter by status"><SelectValue>{status ? STATUS_LABELS[status] ?? status : "All statuses"}</SelectValue></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="OPEN">Open</SelectItem>
                <SelectItem value="ASSIGNED">Assigned</SelectItem>
                <SelectItem value="IN_PROGRESS">In progress</SelectItem>
                <SelectItem value="ON_HOLD">On hold</SelectItem>
                <SelectItem value="RESOLVED">Resolved</SelectItem>
                <SelectItem value="CLOSED">Closed</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priority || "all"} onValueChange={(v) => updateSearch({ priority: v === "all" ? "" : v, page: undefined })}>
              <SelectTrigger className="w-full" aria-label="Filter by priority"><SelectValue>{priority ? priority.charAt(0) + priority.slice(1).toLowerCase() : "All priorities"}</SelectValue></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All priorities</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="URGENT">Urgent</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryId || "all"} onValueChange={(v) => updateSearch({ categoryId: v === "all" ? "" : v, page: undefined })}>
              <SelectTrigger className="w-full" aria-label="Filter by category"><SelectValue>{categoryId ? ((categories?.categories || []).find((c) => c.id === categoryId)?.name ?? "Category") : "All categories"}</SelectValue></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {(categories?.categories || []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={(v) => updateSearch({ sort: v as "newest" | "oldest" | "priority", page: undefined })}>
              <SelectTrigger className="w-full" aria-label="Sort order"><SelectValue>{SORT_LABELS[sort] ?? "Newest first"}</SelectValue></SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest first</SelectItem>
                <SelectItem value="oldest">Oldest first</SelectItem>
                <SelectItem value="priority">By priority</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
            </Button>
          )}
        </CardContent>
      </Card>

      {error ? (
        <EmptyState icon={Inbox} title="Could not load requests" description={error} action={<Button variant="outline" onClick={() => { void refetch(); }}>Try again</Button>} />
      ) : loading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={hasFilters ? "No matching requests" : "No requests yet"}
          description={hasFilters ? "Try adjusting or resetting the filters." : isStudent ? "Submit your first maintenance request to see it here." : user?.role === "OFFICER" ? "Jobs assigned to you will appear here." : "Requests across the campus will appear here."}
          action={hasFilters ? <Button variant="outline" onClick={reset}>Reset filters</Button> : isStudent ? <Button onClick={() => navigate("new-request")}><PlusCircle className="mr-2 h-4 w-4" /> New Request</Button> : undefined}
        />
      ) : (
        <>
          <Card className="hidden overflow-hidden py-0 md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left text-xs  text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Reference</th>
                    <th className="px-4 py-3 font-medium">Issue</th>
                    <th className="hidden px-4 py-3 font-medium lg:table-cell">Category</th>
                    <th className="hidden px-4 py-3 font-medium xl:table-cell">Location</th>
                    <th className="px-4 py-3 font-medium">Priority</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="hidden px-4 py-3 font-medium sm:table-cell">Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((r) => (
                    <tr
                      key={r.id}
                      tabIndex={0}
                      role="button"
                      aria-label={`Open request ${r.reference}: ${r.title}`}
                      className="cursor-pointer border-b transition-colors last:border-0 outline-none hover:bg-secondary focus-visible:bg-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
                      onClick={() => navigate("request-detail", r.reference)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          navigate("request-detail", r.reference);
                        }
                      }}
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-xs tabular-nums font-semibold text-foreground">{r.reference}</td>
                      <td className="max-w-64 px-4 py-3">
                        <p className="truncate font-medium">{r.title}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {r.attachments.length > 0 && <span className="mr-2 inline-flex items-center gap-0.5"><ImageIcon className="h-3 w-3" />{r.attachments.length}</span>}
                          {(r._count?.comments || 0) > 0 && <span className="mr-2 inline-flex items-center gap-0.5"><MessageSquare className="h-3 w-3" />{r._count?.comments}</span>}
                          {user?.role !== "STUDENT" && user?.role !== "STAFF" ? <>by {r.creator.name}</> : r.location}
                        </p>
                      </td>
                      <td className="hidden px-4 py-3 lg:table-cell">
                        <span className="inline-flex items-center gap-1.5 text-xs">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-foreground">
                            <CategoryIcon icon={r.category.icon} className="h-3 w-3" />
                          </span>
                          {r.category.name}
                        </span>
                      </td>
                      <td className="hidden max-w-40 truncate px-4 py-3 text-xs text-muted-foreground xl:table-cell">{r.location}</td>
                      <td className="px-4 py-3"><PriorityBadge priority={r.priority} /></td>
                      <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                      <td className="hidden whitespace-nowrap px-4 py-3 text-xs text-muted-foreground sm:table-cell">{timeAgo(r.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="space-y-3 md:hidden">
            {data.items.map((r) => (
              <button
                key={r.id}
                className="w-full rounded-md border bg-card p-4 text-left  transition-colors hover:border-foreground"
                onClick={() => navigate("request-detail", r.reference)}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs tabular-nums font-semibold text-foreground">{r.reference}</span>
                  <StatusBadge status={r.status} />
                  <PriorityBadge priority={r.priority} />
                </div>
                <p className="mt-1.5 font-medium">{r.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{r.category.name} · {r.location} · {timeAgo(r.createdAt)}</p>
              </button>
            ))}
          </div>

          <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <p className="text-xs text-muted-foreground">
              Showing <span className="font-medium text-foreground">{(data.page - 1) * data.pageSize + 1}–{Math.min(data.page * data.pageSize, data.total)}</span> of{" "}
              <span className="font-medium text-foreground">{data.total}</span> request(s)
            </p>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={data.page <= 1} onClick={() => setPage(data.page - 1)} aria-label="Previous page">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {Array.from({ length: data.totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === data.totalPages || Math.abs(p - data.page) <= 1)
                .map((p, idx, arr) => (
                  <span key={p} className="flex items-center">
                    {idx > 0 && arr[idx - 1] !== p - 1 && <span className="px-1 text-xs text-muted-foreground">…</span>}
                    <Button
                      variant={p === data.page ? "default" : "outline"}
                      size="icon"
                      className={cn("h-8 w-8 text-xs")}
                      onClick={() => setPage(p)}
                      aria-label={`Page ${p}`}
                      aria-current={p === data.page ? "page" : undefined}
                    >
                      {p}
                    </Button>
                  </span>
                ))}
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={data.page >= data.totalPages} onClick={() => setPage(data.page + 1)} aria-label="Next page">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
