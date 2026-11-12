"use client";

import { useEffect } from "react";
import { useAppStore } from "@/stores/app-store";
import { api } from "@/lib/client";
import type { SessionUser } from "@/types";

export function useEnsureSession() {
  const { setUser, setAuthChecked, reset } = useAppStore();

  useEffect(() => {
    if (useAppStore.getState().authChecked) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api<{ user: SessionUser | null }>("/api/me");
        if (!cancelled && res.user) setUser(res.user);
      } catch {
        if (!cancelled) reset();
      } finally {
        if (!cancelled) setAuthChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
