"use client";

import type { ComponentType } from "react";
import { ChevronLeft, ChevronRight } from "@/components/icons";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

type Icon = ComponentType<{ className?: string }>;

export function ListError({ error, onRetry, title, icon }: {
  error: string;
  onRetry?: () => void;
  title: string;
  icon: Icon;
}) {
  return (
    <EmptyState
      icon={icon}
      title={title}
      description={error}
      action={onRetry ? <Button variant="outline" onClick={onRetry}>Retry</Button> : undefined}
    />
  );
}

export function ListLoadingRows({ count = 5, rowClassName = "h-20" }: { count?: number; rowClassName?: string }) {
  return <div className="space-y-3">{[...Array(count)].map((_, i) => <Skeleton key={i} className={`${rowClassName} w-full`} />)}</div>;
}

export function ListPagination({ page, totalPages, total, noun, onPage }: {
  page: number;
  totalPages: number;
  total: number;
  noun: string;
  onPage: (updater: (p: number) => number) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-xs text-muted-foreground">Page {page} of {totalPages} · {total} {noun}</p>
      <div className="flex gap-1">
        <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => onPage((p) => p - 1)} aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></Button>
        <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => onPage((p) => p + 1)} aria-label="Next page"><ChevronRight className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}
