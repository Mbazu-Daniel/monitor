import { useEffect, useState } from "react";
import { useFetch } from "@/hooks/use-fetch";
import { api, qs } from "@/lib/client";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  PriorityBadge, timeAgo, EmptyState, PageHeader, STATUS_META,
} from "@/components/shared";
import { useViewNav } from "@/lib/view-nav";
import { useAppStore } from "@/stores/app-store";
import { canTransition } from "@mivacampus/contracts";
import type { Paginated, ServiceRequestRow, RequestStatus, Priority } from "@/types";
import { Wrench, MoreHorizontal } from "@/components/icons";
import { cn } from "@/lib/utils";

const COLUMNS = [
  { status: "ASSIGNED", title: "To start" },
  { status: "IN_PROGRESS", title: "In progress" },
  { status: "ON_HOLD", title: "On hold" },
  { status: "RESOLVED", title: "Resolved" },
] as const;

type ColumnStatus = (typeof COLUMNS)[number]["status"];

const OFFICER_TARGETS: RequestStatus[] = ["IN_PROGRESS", "ON_HOLD", "RESOLVED"];
const PRIORITY_RANK: Record<Priority, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
const STALE_MS = 3 * 24 * 60 * 60 * 1000;

function legalTargets(job: ServiceRequestRow, role: string | null | undefined): ColumnStatus[] {
  const allowed = role === "ADMIN" ? COLUMNS.map((c) => c.status) : OFFICER_TARGETS;
  return COLUMNS.map((c) => c.status).filter(
    (status) => status !== job.status && allowed.includes(status) && canTransition(job.status, status),
  );
}

function isStale(job: ServiceRequestRow) {
  return job.status !== "RESOLVED" && Date.now() - new Date(job.updatedAt).getTime() > STALE_MS;
}

export function WorkBoardView() {
  const navigate = useViewNav();
  const { data, loading, refetch } = useFetch<Paginated<ServiceRequestRow>>(`/api/requests${qs({ pageSize: 50, sort: "newest" })}`);
  const [jobs, setJobs] = useState<ServiceRequestRow[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<ColumnStatus | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);
  const role = useAppStore((s) => s.user?.role);

  useEffect(() => {
    if (!data) return;
    setJobs((current) => {
      const server = data.items.filter((r) => r.status !== "CLOSED" && r.status !== "REJECTED");
      const pending = current.filter((j) => movingId === j.id);
      if (pending.length === 0) return server;
      return server.map((s) => pending.find((p) => p.id === s.id) ?? s);
    });
  }, [data, movingId]);

  async function move(job: ServiceRequestRow, to: ColumnStatus) {
    if (job.status === to || movingId) return;
    const previous = jobs;
    setMovingId(job.id);
    setJobs((list) => list.map((j) => (j.id === job.id ? { ...j, status: to, updatedAt: new Date().toISOString() } : j)));
    try {
      await api(`/api/requests/${job.id}/status`, { method: "POST", body: JSON.stringify({ status: to }) });
      const column = COLUMNS.find((c) => c.status === to);
      toast.success(`${job.reference} moved to ${column?.title ?? to}`, {
        action: { label: "View", onClick: () => navigate("request-detail", job.reference) },
      });
      await refetch();
    } catch (e) {
      setJobs(previous);
      toast.error(e instanceof Error ? e.message : "Failed to move the job");
    } finally {
      setMovingId(null);
    }
  }

  const dragged = jobs.find((j) => j.id === dragId) ?? null;
  const canDrop = (status: ColumnStatus) => dragged !== null && legalTargets(dragged, role).includes(status);

  const columns = COLUMNS.map((col) => ({
    ...col,
    jobs: jobs
      .filter((r) => r.status === col.status)
      .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
  }));

  return (
    <div className="space-y-5">
      <PageHeader title="Work board" description="Drag a job onto another stage to change its status. Everyone involved is notified on every move.">
        <Button variant="ghost" onClick={() => navigate("requests")}>
          <Wrench className="mr-2 h-4 w-4" /> All jobs
        </Button>
      </PageHeader>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-72 w-full rounded-2xl" />)}
        </div>
      ) : jobs.length === 0 ? (
        <EmptyState icon={Wrench} title="No active assignments" description="Assigned jobs land here as they come in. Drag a card to move it between stages." />
      ) : (
        <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-4">
          {columns.map((col) => {
            const colMeta = STATUS_META[col.status];
            const isDroppable = canDrop(col.status);
            const isOver = overColumn === col.status;
            return (
              <section
                key={col.status}
                data-testid={`board-col-${col.status}`}
                aria-label={col.title}
                onDragOver={(e) => {
                  if (canDrop(col.status)) {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    if (overColumn !== col.status) setOverColumn(col.status);
                  }
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                    setOverColumn((current) => (current === col.status ? null : current));
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const id = e.dataTransfer.getData("text/plain") || dragId;
                  setOverColumn(null);
                  setDragId(null);
                  const job = jobs.find((j) => j.id === id);
                  if (job && canDrop(col.status) && legalTargets(job, role).includes(col.status)) {
                    void move(job, col.status);
                  }
                }}
                className={cn(
                  "flex flex-col rounded-2xl border border-border/60 bg-secondary/40 p-2 transition-all duration-200",
                  dragId && isDroppable && !isOver && "border-dashed border-[var(--accent)]/50",
                  dragId && !isDroppable && "opacity-60 saturate-50",
                  isOver && "border-[var(--accent)] bg-[var(--accent-soft)] ring-2 ring-[var(--accent)]",
                )}
              >
                <header className="flex items-center justify-between gap-2 px-2 pb-2 pt-1.5">
                  <div className="flex items-center gap-2">
                    <span className={cn("size-2 rounded-full", colMeta.dot)} aria-hidden />
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{col.title}</p>
                  </div>
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-card px-1.5 text-[11px] font-semibold tabular-nums text-muted-foreground">{col.jobs.length}</span>
                </header>
                <div className="flex min-h-[140px] flex-col gap-2">
                  {col.jobs.map((r) => {
                    const targets = legalTargets(r, role);
                    const isDragging = dragId === r.id;
                    const isMoving = movingId === r.id;
                    const stale = isStale(r);
                    return (
                      <article
                        key={r.id}
                        draggable={!isMoving}
                        role="link"
                        tabIndex={0}
                        aria-label={`Open ${r.reference}: ${r.title}`}
                        onClick={() => navigate("request-detail", r.reference)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") navigate("request-detail", r.reference);
                        }}
                        onDragStart={(e) => {
                          setDragId(r.id);
                          e.dataTransfer.setData("text/plain", r.id);
                          e.dataTransfer.effectAllowed = "move";
                        }}
                        onDragEnd={() => {
                          setDragId(null);
                          setOverColumn(null);
                        }}
                        className={cn(
                          "cursor-grab rounded-xl border border-border bg-card p-3 shadow-[var(--shadow)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] active:cursor-grabbing",
                          isDragging && "rotate-[0.5deg] opacity-60 ring-2 ring-[var(--accent)]",
                          isMoving && "opacity-70",
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold tabular-nums text-foreground">{r.reference}</span>
                          <PriorityBadge priority={r.priority} />
                          <span
                            className={cn("ml-auto text-[11px] tabular-nums text-muted-foreground", stale && "font-semibold text-[var(--cta)]")}
                            title={stale ? `No activity for 3+ days` : undefined}
                          >
                            {timeAgo(r.updatedAt)}
                          </span>
                          {targets.length > 0 && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  className="-mr-1 rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                                  aria-label={`Move ${r.reference}`}
                                  onClick={(e) => e.stopPropagation()}
                                  onKeyDown={(e) => e.stopPropagation()}
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-44">
                                <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Move to</p>
                                {targets.map((target) => (
                                  <DropdownMenuItem key={target} onClick={() => void move(r, target)}>
                                    {COLUMNS.find((c) => c.status === target)?.title}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                        <p className="mt-1.5 line-clamp-2 text-[13.5px] font-semibold leading-snug">{r.title}</p>
                        <p className="mt-1 truncate text-[11.5px] text-muted-foreground">{r.creator.name}</p>
                      </article>
                    );
                  })}
                  {col.jobs.length === 0 && (
                    <div
                      className={cn(
                        "flex flex-1 items-center justify-center rounded-xl border border-dashed p-4 text-[12px] transition-colors",
                        isOver
                          ? "border-[var(--accent)]/60 bg-[var(--accent-soft)]/50 font-medium text-[var(--accent-deep)]"
                          : "border-foreground/15 text-muted-foreground",
                      )}
                    >
                      {dragId ? "Release to drop here" : "Nothing here"}
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
      {!loading && data && data.total > jobs.length && (
        <button
          onClick={() => navigate("requests")}
          className="w-full rounded-xl border border-dashed border-border px-4 py-2.5 text-center text-[12px] font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          Showing {jobs.length} of {data.total} assigned jobs. Open All jobs to see the rest
        </button>
      )}
    </div>
  );
}
