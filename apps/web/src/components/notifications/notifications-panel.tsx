"use client";

import { useEffect, useState } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/client";
import { timeAgo, formatDateTime } from "@/components/shared/format";
import { useViewNav } from "@/lib/view-nav";
import { cn } from "@/lib/utils";
import type { NotificationsResponse, NotificationRow } from "@/types";
import {
  ArrowLeft, ArrowRight, Bell, CheckCheck, ChevronDownIcon, ClipboardList, Inbox, Loader2, X, Zap,
} from "@/components/icons";

const PAGE_SIZE = 10;

export const NOTIFICATIONS_REFRESH = "notifications:refresh";

const TYPE_STYLES: Record<string, string> = {
  INFO: "bg-secondary text-foreground/80",
  SUCCESS: "bg-green-soft text-green-deep",
  WARNING: "bg-[var(--accent-soft)] text-[var(--accent-deep)]",
  ASSIGNMENT: "bg-blue-soft text-blue-deep",
  STATUS: "bg-secondary text-foreground/80",
  COMMENT: "bg-blue-soft text-blue-deep",
};

function NotificationItem({ n, onOpen }: { n: NotificationRow; onOpen: (n: NotificationRow) => void }) {
  return (
    <li>
      <button
        onClick={() => onOpen(n)}
        className={cn(
          "flex w-full items-start gap-3 px-5 py-3.5 text-left transition-colors hover:bg-secondary/70",
          !n.isRead && "bg-[color-mix(in_srgb,var(--accent-soft)_40%,transparent)]"
        )}
      >
        <span className={cn("mt-0.5 h-2 w-2 shrink-0 rounded-full", n.isRead ? "bg-transparent" : "bg-[var(--accent)]")} aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]", TYPE_STYLES[n.type] ?? TYPE_STYLES.INFO)}>
              {n.type}
            </span>
            <span className="text-[11px] text-muted-foreground">{timeAgo(n.createdAt)}</span>
          </span>
          <span className="mt-1.5 block text-[13px] font-semibold leading-snug">{n.title}</span>
          <span className="mt-0.5 line-clamp-2 block text-[12px] leading-snug text-muted-foreground">{n.message}</span>
        </span>
      </button>
    </li>
  );
}

function NotificationList({ isLoading, items, onOpen }: { isLoading: boolean; items: NotificationRow[]; onOpen: (n: NotificationRow) => void }) {
  if (isLoading) {
    return <div className="space-y-2 p-4">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>;
  }
  if (items.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <Inbox className="h-8 w-8 text-muted-foreground/60" />
        <div>
          <p className="text-[15px] font-semibold">Nothing yet</p>
          <p className="mt-1 max-w-[28ch] text-[13px] text-muted-foreground">Updates on your requests will land here.</p>
        </div>
      </div>
    );
  }
  return (
    <ul className="divide-y divide-border/60">
      {items.map((n) => (
        <NotificationItem key={n.id} n={n} onOpen={onOpen} />
      ))}
    </ul>
  );
}

function refreshBadge() {
  window.dispatchEvent(new Event(NOTIFICATIONS_REFRESH));
}

function PanelHeader({ unread, onMarkAllRead, onClose }: { unread: number; onMarkAllRead: () => void; onClose: () => void }) {
  return (
    <div className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-border/70 px-5">
      <div className="flex items-center gap-2.5">
        <Bell className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-[15px] font-semibold">Notifications</h2>
        {unread > 0 && (
          <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--accent-deep)]">{unread} new</span>
        )}
      </div>
      <div className="flex items-center gap-1">
        {unread > 0 && (
          <button
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[12px] font-medium text-[var(--cta)] transition-colors hover:bg-secondary"
            onClick={onMarkAllRead}
          >
            <CheckCheck className="h-3.5 w-3.5" /> Mark all read
          </button>
        )}
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose} aria-label="Close notifications">
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function LoadMoreFooter({ hasNextPage, isFetching, itemCount, onLoadMore }: { hasNextPage: boolean; isFetching: boolean; itemCount: number; onLoadMore: () => void }) {
  if (hasNextPage) {
    return (
      <Button variant="outline" className="w-full" onClick={onLoadMore} disabled={isFetching}>
        {isFetching ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…</> : <>Load older <ChevronDownIcon className="ml-2 h-4 w-4" /></>}
      </Button>
    );
  }
  if (itemCount > 0) {
    return <p className="py-1 text-center text-[11.5px] text-muted-foreground">You&apos;re all caught up.</p>;
  }
  return null;
}

export function NotificationsPanel({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<NotificationRow | null>(null);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery<NotificationsResponse>({
    queryKey: ["notifications"],
    queryFn: ({ pageParam }) => api<NotificationsResponse>(`/api/notifications?page=${pageParam}&pageSize=${PAGE_SIZE}`),
    initialPageParam: 1,
    getNextPageParam: (last, allPages) => (allPages.length * PAGE_SIZE < last.total ? allPages.length + 1 : undefined),
    enabled: open,
  });

  const items = (data?.pages ?? []).flatMap((p) => p.items);
  const unread = data?.pages[0]?.unread ?? 0;

  useEffect(() => {
    if (!open) setSelected(null);
  }, [open]);

  async function openNotification(n: NotificationRow) {
    setSelected(n);
    if (n.isRead) return;
    try {
      await api(`/api/notifications/${n.id}/read`, { method: "POST" });
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
      refreshBadge();
    } catch {
      toast.error("Could not mark the notification as read.");
    }
  }

  async function markAllRead() {
    try {
      await api("/api/notifications/read-all", { method: "POST" });
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
      refreshBadge();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not mark all as read.");
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-md p-0 sm:max-w-md">
        <SheetTitle className="sr-only">Notifications</SheetTitle>
        {selected ? (
          <DetailView notification={selected} onBack={() => setSelected(null)} onOpenChange={onOpenChange} />
        ) : (
          <>
            <PanelHeader unread={unread} onMarkAllRead={() => void markAllRead()} onClose={() => onOpenChange(false)} />

            <div className="flex h-[calc(100%-4rem)] flex-col">
              <div className="flex-1 overflow-y-auto">
                <NotificationList isLoading={isLoading} items={items} onOpen={(n) => void openNotification(n)} />
              </div>

              <div className="shrink-0 border-t border-border/70 px-5 py-3">
                <LoadMoreFooter hasNextPage={hasNextPage ?? false} isFetching={isFetchingNextPage} itemCount={items.length} onLoadMore={() => void fetchNextPage()} />
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function DetailView({ notification: n, onBack, onOpenChange }: { notification: NotificationRow; onBack: () => void; onOpenChange: (open: boolean) => void }) {
  const navigate = useViewNav();
  const requestReference = n.requestReference;

  return (
    <>
      <div className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-border/70 px-4">
        <button onClick={onBack} className="flex items-center gap-1 rounded-full py-1.5 pl-1.5 pr-3 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground" aria-label="Back to notifications">
          <ArrowLeft className="h-4 w-4" /> All notifications
        </button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onOpenChange(false)} aria-label="Close notifications">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="h-[calc(100%-4rem)] overflow-y-auto px-5 py-5">
        <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]", TYPE_STYLES[n.type] ?? TYPE_STYLES.INFO)}>{n.type}</span>
        <h2 className="mt-3 text-[22px] font-semibold leading-snug tracking-tight">{n.title}</h2>
        <p className="mt-1.5 text-[12px] text-muted-foreground">{formatDateTime(n.createdAt)} · {timeAgo(n.createdAt)}</p>

        <div className="mt-5 rounded-2xl border border-border bg-card p-4">
          <p className="whitespace-pre-line text-[14px] leading-relaxed text-foreground/90">{n.message}</p>
        </div>

        {requestReference && (
          <div className="mt-4 overflow-hidden rounded-2xl border border-border">
            <p className="border-b border-border/70 bg-secondary/50 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Related request</p>
            <button
              className="group flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-secondary/70"
              onClick={() => {
                onOpenChange(false);
                navigate("request-detail", requestReference);
              }}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-muted-foreground transition-colors group-hover:bg-[var(--accent-soft)] group-hover:text-[var(--accent-deep)]">
                {n.type === "ASSIGNMENT" ? <Zap className="h-5 w-5" /> : <ClipboardList className="h-5 w-5" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13.5px] font-semibold tabular-nums">{requestReference}</span>
                <span className="block text-[12px] text-muted-foreground">Open the request to see progress and act on it</span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        )}
      </div>
    </>
  );
}
