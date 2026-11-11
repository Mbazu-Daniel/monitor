"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/client";

/**
 * Lightweight data-fetching hook with optional polling (used for
 * near-real-time notification and status updates).
 */
export function useFetch<T>(url: string | null, options?: { pollMs?: number; deps?: unknown[] }) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!url);
  const mounted = useRef(true);
  const pollMs = options?.pollMs;

  const fetchData = useCallback(
    async (silent = false) => {
      if (!url) return;
      if (!silent) setLoading(true);
      try {
        const result = await api<T>(url);
        if (mounted.current) {
          setData(result);
          setError(null);
        }
      } catch (e) {
        if (mounted.current) {
          setError(e instanceof Error ? e.message : "Failed to load data");
        }
      } finally {
        if (mounted.current) setLoading(false);
      }
    },
    [url]
  );

  useEffect(() => {
    mounted.current = true;
    fetchData();
    return () => {
      mounted.current = false;
    };
  }, [url, ...(options?.deps || [])]);

  useEffect(() => {
    if (!pollMs || !url) return;
    const id = setInterval(() => fetchData(true), pollMs);
    return () => clearInterval(id);
  }, [pollMs, url, ...(options?.deps || [])]);

  return { data, error, loading, refetch: () => fetchData(true) };
}
