import { createFileRoute } from "@tanstack/react-router";
import { RequestsListView } from "@/components/requests/requests-list";

export type RequestsSearch = {
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

function cleanSort(value: unknown): "newest" | "oldest" | "priority" | undefined {
  const sort = clean(value);
  return sort === "oldest" || sort === "priority" ? sort : undefined;
}

function cleanPage(value: unknown): number | undefined {
  const raw = typeof value === "string" ? Number(value) : typeof value === "number" ? value : Number.NaN;
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : undefined;
}

function cleanFilters(search: Record<string, unknown>): RequestsSearch {
  return {
    status: clean(search.status),
    priority: clean(search.priority),
    categoryId: clean(search.categoryId),
    q: clean(search.q),
    sort: cleanSort(search.sort),
    page: cleanPage(search.page),
  };
}

export const Route = createFileRoute("/$orgSlug/requests/")({
  validateSearch: (search: Record<string, unknown>): RequestsSearch => cleanFilters(search),
  component: RequestsListView,
});
