export interface Pagination {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
}

export function parsePagination(query: Record<string, unknown>, defaultPageSize = 8): Pagination {
  const raw = (key: string) => {
    const value = query[key];
    const n = Array.isArray(value) ? Number(value[0]) : Number(value);
    return Number.isFinite(n) ? Math.floor(n) : undefined;
  };
  const page = Math.max(1, raw("page") ?? 1);
  const pageSize = Math.min(50, Math.max(1, raw("pageSize") ?? defaultPageSize));
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

export function csvEscape(value: string | number | null | undefined): string {
  const s = value === null || value === undefined ? "" : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
