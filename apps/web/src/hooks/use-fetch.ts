import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/client";


export function useFetch<T>(url: string | null, options?: { pollMs?: number; deps?: unknown[] }) {
  let deps: unknown[] = [];
  let refetchInterval: number | false = false;
  if (options?.deps) deps = options.deps;
  if (options?.pollMs) refetchInterval = options.pollMs;
  const query = useQuery({
    queryKey: [url, ...deps],
    queryFn: () => api<T>(url!),
    enabled: Boolean(url),
    refetchInterval,
  });
  return { data: query.data ?? null, error: query.error?.message ?? null, loading: query.isLoading, refetch: query.refetch };
}
