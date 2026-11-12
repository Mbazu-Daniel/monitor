"use client";

import { createFileRoute } from "@tanstack/react-router";
import { RequestsListView } from "@/components/requests/requests-list";

type RequestsSearch = {
  status?: string;
  priority?: string;
  categoryId?: string;
  q?: string;
  sort?: "newest" | "oldest" | "priority";
  page?: number;
};

function clean(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export const Route = createFileRoute("/$orgSlug/requests/")({
  validateSearch: (search: Record<string, unknown>): RequestsSearch => {
    const sort = clean(search.sort);
    const rawPage = typeof search.page === "string" ? Number(search.page) : typeof search.page === "number" ? search.page : Number.NaN;
    return {
      status: clean(search.status),
      priority: clean(search.priority),
      categoryId: clean(search.categoryId),
      q: clean(search.q),
      sort: sort === "oldest" || sort === "priority" ? sort : undefined,
      page: Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : undefined,
    };
  },
  component: RequestsListView,
});
