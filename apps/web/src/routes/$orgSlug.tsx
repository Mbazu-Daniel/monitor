"use client";

import { useEffect, useRef, useState } from "react";
import { createFileRoute, Outlet, Navigate, useNavigate } from "@tanstack/react-router";
import { useAppStore } from "@/stores/app-store";
import { useFetch } from "@/hooks/use-fetch";
import { api, ApiError } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/layout/app-shell";
import { Splash } from "@/components/layout/splash";
import { useEnsureSession } from "@/lib/use-ensure-session";
import type { SessionUser } from "@/types";

export const Route = createFileRoute("/$orgSlug")({
  component: OrgGate,
});

type OrgSummary = { id: string; name: string; slug: string; role: string };

function OrgGate() {
  const { orgSlug } = Route.useParams();
  const { user, setUser, authChecked } = useAppStore();
  const navigate = useNavigate();
  useEnsureSession();

  const isOwnOrg = Boolean(user?.organizationCode && user.organizationCode === orgSlug);
  const { data: orgs, loading: orgsLoading } = useFetch<{ organizations: OrgSummary[] }>(!user || isOwnOrg ? null : "/api/organizations");
  const membership = orgs?.organizations.find((o) => o.slug === orgSlug);
  const [switching, setSwitching] = useState(false);
  const switchStarted = useRef(false);

  useEffect(() => {
    if (!user || isOwnOrg || orgsLoading || switchStarted.current) return;
    if (!membership) return;
    switchStarted.current = true;
    setSwitching(true);
    (async () => {
      try {
        await api("/api/auth/organization/set-active", { method: "POST", body: JSON.stringify({ organizationId: membership.id }) });
        const me = await api<{ user: SessionUser }>("/api/me");
        setUser(me.user);
      } catch (e) {
        console.error(e instanceof ApiError ? e.message : e);
        switchStarted.current = false;
      } finally {
        setSwitching(false);
      }
    })();
  }, [user, isOwnOrg, orgsLoading, membership, setUser]);

  if (!authChecked) return <Splash />;
  if (!user) return <Navigate to="/" replace />;
  if (isOwnOrg) {
    return (
      <AppShell>
        <Outlet />
      </AppShell>
    );
  }
  if (orgsLoading || switching) return <Splash />;
  if (!membership) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-5 bg-background px-6 text-center">
        <span className="mark block h-12 w-12" aria-hidden />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">No campus at that link</h1>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">This campus code doesn&apos;t match any campus your account belongs to.</p>
        </div>
        {user.organizationCode ? (
          <Button onClick={() => navigate({ to: "/$orgSlug", params: { orgSlug: user.organizationCode! } })}>Back to your campus</Button>
        ) : (
          <Button onClick={() => navigate({ to: "/onboarding" })}>Set up a campus</Button>
        )}
      </main>
    );
  }
  return <Splash />;
}
