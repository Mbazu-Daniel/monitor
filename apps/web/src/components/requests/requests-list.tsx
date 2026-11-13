"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFetch } from "@/hooks/use-fetch";
import { useCampusEvents } from "@/hooks/use-campus-events";
import { useAppStore } from "@/stores/app-store";
import { qs } from "@/lib/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  StatusBadge, PriorityBadge, EmptyState, PageHeader, timeAgo, CategoryIcon, formatStatus,
  ListError, ListLoadingRows,
} from "@/components/shared";
import type { Category, Paginated, ServiceRequestRow } from "@/types";
import type { RequestsSearch } from "@/routes/$orgSlug/requests/index";
import { useViewNav } from "@/lib/view-nav";
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import {
  Search, FileText, PlusCircle, RotateCcw, ChevronLeft, ChevronRight, ImageIcon, MessageSquare, Inbox,
} from "@/components/icons";

const SORT_LABELS: Record<string, string> = {
  newest: "Newest first",
  oldest: "Oldest first",
  priority: "By priority",
};

const routeApi = getRouteApi("/$orgSlug/requests/");

const SEARCH_KEYS = ["q", "status", "priority", "categoryId", "sort", "page"] as const;

function mergeSearchParams(prev: RequestsSearch, patch: Partial<RequestsSearch>): RequestsSearch {
  const next: RequestsSearch = { ...prev, ...patch };
  for (const key of SEARCH_KEYS) {
    if (next[key] === "" || next[key] === undefined) delete next[key];
  }
  if (next.sort === "newest") delete next.sort;
  return next;
}

function isStudentOrStaff(role: string | null | undefined): boolean {
  return role === "STUDENT" || role === "STAFF";
}

function listHeaderFor(role: string | null | undefined) {
  if (role === "ADMIN") {
    return { title: "All Requests", desc: "Every maintenance request across campus. Search, filter and manage." };
  }
  if (role === "OFFICER") {
    return { title: "Assigned Jobs", desc: "Jobs assigned to you. Open a job to update progress." };
  }
  return { title: "My Requests", desc: "Requests you have submitted and their current status." };
}

function emptyListCopy(hasFilters: boolean, role: string | null | undefined) {
  if (hasFilters) {
    return { title: "No matching requests", description: "Try adjusting or resetting the filters." };
  }
  if (role === "OFFICER") {
    return { title: "No requests yet", description: "Jobs assigned to you will appear here." };
  }
  if (isStudentOrStaff(role)) {
    return { title: "No requests yet", description: "Submit your first maintenance request to see it here." };
  }
  return { title: "No requests yet", description: "Requests across the campus will appear here." };
}

function pageNumbers(current: number, totalPages: number): number[] {
  return Array.from({ length: totalPages }, (_, i) => i + 1).filter((p) => p === 1 || p === totalPages || Math.abs(p - current) <= 1);
}

function statusTransitionDetail(detail: string | null | undefined): string {
  if (!detail) return "";
  return ` (${detail.split(" → ").map((s) => formatStatus(s.trim())).join(" → ")})`;
}

function SearchBox({ q, onQuery }: { q: string; onQuery: (value: string) => void }) {
  const [value, setValue] = useState(q);
  const onQueryRef = useRef(onQuery);
  onQueryRef.current = onQuery;

  useEffect(() => {
    setValue(q);
  }, [q]);

  useEffect(() => {
    if (value === q) return;
    const t = setTimeout(() => onQueryRef.current(value), 350);
    return () => clearTimeout(t);
  }, [value, q]);

  return (
    <div className="relative flex-1">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        className="pl-9"
        placeholder="Search by reference, title, location…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-label="Search requests"
      />
    </div>
  );
}

const filterStatusLabel = (status: string) => (status ? formatStatus(status) : "All statuses");
const filterPriorityLabel = (priority: string) => (priority ? priority.charAt(0) + priority.slice(1).toLowerCase() : "All priorities");
const filterCategoryLabel = (categoryId: string, categories: Category[]) =>
  categoryId ? (categories.find((c) => c.id === categoryId)?.name ?? "Category") : "All categories";
const filterSortLabel = (sort: string) => SORT_LABELS[sort] ?? "Newest first";

function RequestFilters({ status, priority, categoryId, sort, categories, onStatus, onPriority, onCategory, onSort }: {
  status: string;
  priority: string;
  categoryId: string;
  sort: string;
  categories: Category[];
  onStatus: (v: string) => void;
  onPriority: (v: string) => void;
  onCategory: (v: string) => void;
  onSort: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <Select value={status || "all"} onValueChange={onStatus}>
        <SelectTrigger className="w-full" aria-label="Filter by status"><SelectValue>{filterStatusLabel(status)}</SelectValue></SelectTrigger>
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
      <Select value={priority || "all"} onValueChange={onPriority}>
        <SelectTrigger className="w-full" aria-label="Filter by priority"><SelectValue>{filterPriorityLabel(priority)}</SelectValue></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All priorities</SelectItem>
          <SelectItem value="LOW">Low</SelectItem>
          <SelectItem value="MEDIUM">Medium</SelectItem>
          <SelectItem value="HIGH">High</SelectItem>
          <SelectItem value="URGENT">Urgent</SelectItem>
        </SelectContent>
      </Select>
      <Select value={categoryId || "all"} onValueChange={onCategory}>
        <SelectTrigger className="w-full" aria-label="Filter by category"><SelectValue>{filterCategoryLabel(categoryId, categories)}</SelectValue></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All categories</SelectItem>
          {categories.map((c) => (
            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={sort} onValueChange={onSort}>
        <SelectTrigger className="w-full" aria-label="Sort order"><SelectValue>{filterSortLabel(sort)}</SelectValue></SelectTrigger>
        <SelectContent>
          <SelectItem value="newest">Newest first</SelectItem>
          <SelectItem value="oldest">Oldest first</SelectItem>
          <SelectItem value="priority">By priority</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

function RequestCounts({ r }: { r: ServiceRequestRow }) {
  const comments = r._count?.comments || 0;
  return (
    <>
      {r.attachments.length > 0 && <span className="mr-2 inline-flex items-center gap-0.5"><ImageIcon className="h-3 w-3" />{r.attachments.length}</span>}
      {comments > 0 && <span className="mr-2 inline-flex items-center gap-0.5"><MessageSquare className="h-3 w-3" />{comments}</span>}
    </>
  );
}

function RequestRow({ r, showByline, onOpen }: { r: ServiceRequestRow; showByline: boolean; onOpen: (reference: string) => void }) {
  const open = () => onOpen(r.reference);
  return (
    <tr
      tabIndex={0}
      role="button"
      aria-label={`Open request ${r.reference}: ${r.title}`}
      className="cursor-pointer border-b transition-colors last:border-0 outline-none hover:bg-secondary focus-visible:bg-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open();
        }
      }}
    >
      <td className="whitespace-nowrap px-4 py-3 text-xs tabular-nums font-semibold text-foreground">{r.reference}</td>
      <td className="max-w-64 px-4 py-3">
        <p className="truncate font-medium">{r.title}</p>
        <p className="truncate text-xs text-muted-foreground">
          <RequestCounts r={r} />
          {showByline ? <>by {r.creator.name}</> : r.location}
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
  );
}

function RequestCard({ r, onOpen }: { r: ServiceRequestRow; onOpen: (reference: string) => void }) {
  return (
    <button
      className="w-full rounded-md border bg-card p-4 text-left  transition-colors hover:border-foreground"
      onClick={() => onOpen(r.reference)}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs tabular-nums font-semibold text-foreground">{r.reference}</span>
        <StatusBadge status={r.status} />
        <PriorityBadge priority={r.priority} />
      </div>
      <p className="mt-1.5 font-medium">{r.title}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{r.category.name} · {r.location} · {timeAgo(r.createdAt)}</p>
    </button>
  );
}

function PaginationBar({ page, pageSize, total, totalPages, onPage }: { page: number; pageSize: number; total: number; totalPages: number; onPage: (p: number) => void }) {
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const numbers = pageNumbers(page, totalPages);
  return (
    <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
      <p className="text-xs text-muted-foreground">
        Showing <span className="font-medium text-foreground">{start}–{end}</span> of{" "}
        <span className="font-medium text-foreground">{total}</span> request(s)
      </p>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {numbers.map((p, idx) => (
          <span key={p} className="flex items-center">
            {idx > 0 && numbers[idx - 1] !== p - 1 && <span className="px-1 text-xs text-muted-foreground">…</span>}
            <Button
              variant={p === page ? "default" : "outline"}
              size="icon"
              className="h-8 w-8 text-xs"
              onClick={() => onPage(p)}
              aria-label={`Page ${p}`}
              aria-current={p === page ? "page" : undefined}
            >
              {p}
            </Button>
          </span>
        ))}
        <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => onPage(page + 1)} aria-label="Next page">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function RequestsBody({ error, loading, data, hasFilters, isStudent, role, onRetry, onReset, onNewRequest, onOpenRequest, onPage }: {
  error: string | null;
  loading: boolean;
  data: Paginated<ServiceRequestRow> | null;
  hasFilters: boolean;
  isStudent: boolean;
  role: string | null | undefined;
  onRetry: () => void;
  onReset: () => void;
  onNewRequest: () => void;
  onOpenRequest: (reference: string) => void;
  onPage: (p: number) => void;
}) {
  if (error) {
    return <ListError error={error} onRetry={onRetry} title="Could not load requests" icon={Inbox} />;
  }
  if (loading) {
    return <ListLoadingRows />;
  }
  if (!data || data.items.length === 0) {
    const copy = emptyListCopy(hasFilters, role);
    const action = hasFilters
      ? <Button variant="outline" onClick={onReset}>Reset filters</Button>
      : isStudent
        ? <Button onClick={onNewRequest}><PlusCircle className="mr-2 h-4 w-4" /> New Request</Button>
        : undefined;
    return <EmptyState icon={FileText} title={copy.title} description={copy.description} action={action} />;
  }
  const showByline = !isStudent;
  return (
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
                <RequestRow key={r.id} r={r} showByline={showByline} onOpen={onOpenRequest} />
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="space-y-3 md:hidden">
        {data.items.map((r) => (
          <RequestCard key={r.id} r={r} onOpen={onOpenRequest} />
        ))}
      </div>

      <PaginationBar page={data.page} pageSize={data.pageSize} total={data.total} totalPages={data.totalPages} onPage={onPage} />
    </>
  );
}

function hasAnyFilter(q: string, status: string, priority: string, categoryId: string): boolean {
  return Boolean(q || status || priority || categoryId);
}

function useCampusToast(refetch: () => void, userId: string | undefined) {
  useCampusEvents((event) => {
    refetch();
    if (event.actorId === userId) return;
    const detail = event.type === "REQUEST_STATUS_CHANGED" ? statusTransitionDetail(event.detail) : "";
    toast.message(`${event.reference}${detail}`, { description: `${event.actorName} · ${event.title}` });
  });
}

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

  const filters = { search: q, status, priority, categoryId, sort };
  const hasFilters = hasAnyFilter(q, status, priority, categoryId);

  function updateSearch(patch: Partial<RequestsSearch>) {
    routeNavigate({
      search: (prev) => mergeSearchParams({ ...prev }, { ...patch }),
      replace: true,
    });
  }

  function setPage(nextPage: number) {
    routeNavigate({ search: (prev) => ({ ...prev, page: nextPage <= 1 ? undefined : nextPage }), replace: true });
  }

  function reset() {
    routeNavigate({ search: () => ({}), replace: true });
  }

  const { data: categories } = useFetch<{ categories: Category[] }>("/api/categories");
  const query = useMemo(
    () => qs({ ...filters, page, pageSize: 8 }),
    [q, status, priority, categoryId, sort, page]
  );
  const { data, loading, error, refetch } = useFetch<Paginated<ServiceRequestRow>>(`/api/requests${query}`);

  useCampusToast(() => void refetch(), user?.id);

  const isStudent = isStudentOrStaff(user?.role);
  const { title: listTitle, desc: listDesc } = listHeaderFor(user?.role);

  return (
    <div className="space-y-5">
      <PageHeader title={listTitle} description={listDesc}>
        <Button onClick={() => navigate("new-request")}>
          <PlusCircle className="mr-2 h-4 w-4" /> New Request
        </Button>
      </PageHeader>

      <Card className="py-0">
        <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
          <SearchBox q={q} onQuery={(v) => updateSearch({ q: v, page: undefined })} />
          <RequestFilters
            status={status}
            priority={priority}
            categoryId={categoryId}
            sort={sort}
            categories={categories?.categories ?? []}
            onStatus={(v) => updateSearch({ status: v === "all" ? "" : v, page: undefined })}
            onPriority={(v) => updateSearch({ priority: v === "all" ? "" : v, page: undefined })}
            onCategory={(v) => updateSearch({ categoryId: v === "all" ? "" : v, page: undefined })}
            onSort={(v) => updateSearch({ sort: v as "newest" | "oldest" | "priority", page: undefined })}
          />
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
            </Button>
          )}
        </CardContent>
      </Card>

      <RequestsBody
        error={error}
        loading={loading}
        data={data}
        hasFilters={hasFilters}
        isStudent={isStudent}
        role={user?.role}
        onRetry={() => void refetch()}
        onReset={reset}
        onNewRequest={() => navigate("new-request")}
        onOpenRequest={(reference) => navigate("request-detail", reference)}
        onPage={setPage}
      />
    </div>
  );
}
