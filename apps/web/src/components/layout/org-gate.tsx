import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate, Outlet } from "@tanstack/react-router";
import { useAppStore } from "@/stores/app-store";
import { useFetch } from "@/hooks/use-fetch";
import { ApiError } from "@/lib/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/layout/app-shell";
import { Splash } from "@/components/layout/splash";
import { useEnsureSession } from "@/lib/use-ensure-session";
import { OrgSummary, switchOrganization } from "@/lib/organizations";
import type { SessionUser } from "@/types";

function ownsOrg(user: SessionUser | null, orgSlug: string): boolean {
  return Boolean(user?.organizationSlug && user.organizationSlug === orgSlug);
}

function orgFetchPath(user: SessionUser | null, isOwnOrg: boolean): string | null {
  return !user || isOwnOrg ? null : "/api/organizations";
}

function NoCampusAtLink({ organizationSlug, onNavigate }: { organizationSlug: string | null | undefined; onNavigate: (to: "org" | "onboarding") => void }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-5 bg-background px-6 text-center">
      <span className="mark block h-12 w-12" aria-hidden />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">No campus at that link</h1>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">This campus code doesn&apos;t match any campus your account belongs to.</p>
      </div>
      {organizationSlug ? (
        <Button onClick={() => onNavigate("org")}>Back to your campus</Button>
      ) : (
        <Button onClick={() => onNavigate("onboarding")}>Set up a campus</Button>
      )}
    </main>
  );
}

function useOrgSwitch(membership: OrgSummary | undefined, isOwnOrg: boolean, orgsLoading: boolean, user: SessionUser | null, setUser: (u: SessionUser | null) => void) {
  const [switching, setSwitching] = useState(false);
  const switchStarted = useRef(false);

  useEffect(() => {
    if (!user || isOwnOrg || orgsLoading || switchStarted.current) return;
    if (!membership) return;
    switchStarted.current = true;
    setSwitching(true);
    (async () => {
      try {
        await switchOrganization(membership.id, setUser);
      } catch (e) {
        toast.error(e instanceof ApiError ? e.message : "Could not switch campus");
        switchStarted.current = false;
      } finally {
        setSwitching(false);
      }
    })();
  }, [user, isOwnOrg, orgsLoading, membership, setUser]);

  return switching;
}

export function OrgGate({ orgSlug }: { orgSlug: string }) {
  const { user, setUser, authChecked } = useAppStore();
  const navigate = useNavigate();
  useEnsureSession();

  const isOwnOrg = ownsOrg(user, orgSlug);
  const { data: orgs, loading: orgsLoading } = useFetch<{ organizations: OrgSummary[] }>(orgFetchPath(user, isOwnOrg));
  const membership = orgs?.organizations.find((o) => o.slug === orgSlug);
  const switching = useOrgSwitch(membership, isOwnOrg, orgsLoading, user ?? null, setUser);

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
      <NoCampusAtLink
        organizationSlug={user.organizationSlug}
        onNavigate={(to) => {
          if (to === "org" && user.organizationSlug) {
            navigate({ to: "/$orgSlug", params: { orgSlug: user.organizationSlug } });
            return;
          }
          navigate({ to: "/onboarding" });
        }}
      />
    );
  }
  return <Splash />;
}
