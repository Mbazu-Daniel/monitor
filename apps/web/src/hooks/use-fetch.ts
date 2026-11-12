"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/client";


export function useFetch<T>(url: string | null, options?: { pollMs?: number; deps?: unknown[] }) {
  const query = useQuery({
    queryKey: [url, ...(options?.deps || [])],
    queryFn: () => api<T>(url!),
    enabled: Boolean(url),
    refetchInterval: options?.pollMs,
  });
  return { data: query.data ?? null, error: query.error?.message ?? null, loading: query.isLoading, refetch: query.refetch };
}
