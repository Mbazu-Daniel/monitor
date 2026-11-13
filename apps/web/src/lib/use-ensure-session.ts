import { useEffect } from "react";
import { useAppStore } from "@/stores/app-store";
import { api } from "@/lib/client";
import { switchOrganization } from "@/lib/organizations";
import type { SessionUser } from "@/types";

export function useEnsureSession() {
  const { setUser, setAuthChecked, reset } = useAppStore();

  useEffect(() => {
    if (useAppStore.getState().authChecked) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api<{ user: SessionUser | null }>("/api/me");
        if (!cancelled && res.user) {
          setUser(res.user);
          if (res.user.organizationId) {
            await switchOrganization(res.user.organizationId, setUser).catch(() => {});
          }
        }
      } catch {
        if (!cancelled) reset();
      } finally {
        if (!cancelled) setAuthChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
}
