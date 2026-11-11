"use client";

import { useEffect } from "react";
import { useAppStore } from "@/stores/app-store";
import { api } from "@/lib/client";
import { AuthView } from "@/components/maintenance/auth-view";
import { AppShell } from "@/components/maintenance/app-shell";
import { DashboardView } from "@/components/maintenance/dashboards";
import { RequestsListView } from "@/components/maintenance/requests-list";
import { RequestFormView } from "@/components/maintenance/request-form";
import { RequestDetailView } from "@/components/maintenance/request-detail";
import { UsersView } from "@/components/maintenance/admin-users";
import { CategoriesView } from "@/components/maintenance/admin-categories";
import { ReportsView } from "@/components/maintenance/admin-reports";
import { AuditLogView } from "@/components/maintenance/audit-log";
import { ApiDocsView } from "@/components/maintenance/api-docs";
import { ProfileView } from "@/components/maintenance/profile";
import { LandingPage } from "@/components/maintenance/landing/landing-page";
import type { SessionUser } from "@/types";
import { Wrench, Loader2 } from "lucide-react";

export default function Home() {
  const { user, authChecked, view, requestId, landingView, setUser, setAuthChecked, setLandingView } = useAppStore();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api<{ user: SessionUser | null }>("/api/auth/me");
        if (!cancelled) {
          if (res.user) setUser(res.user);
        }
      } catch {
        // not signed in
      } finally {
        if (!cancelled) setAuthChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setUser, setAuthChecked]);

  if (!authChecked) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Wrench className="h-6 w-6" />
        </div>
        <p className="font-display text-sm font-semibold">FixCampus</p>
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Authenticated → app shell
  if (user) {
    return (
      <AppShell>
        {view === "dashboard" && <DashboardView />}
        {view === "requests" && <RequestsListView />}
        {view === "new-request" && <RequestFormView />}
        {view === "request-detail" && requestId && <RequestDetailView id={requestId} />}
        {view === "users" && <UsersView />}
        {view === "categories" && <CategoriesView />}
        {view === "reports" && <ReportsView />}
        {view === "audit" && <AuditLogView />}
        {view === "api-docs" && <ApiDocsView />}
        {view === "profile" && <ProfileView />}
      </AppShell>
    );
  }

  // Unauthenticated: landing page first, then auth (register/login)
  if (landingView === "auth") {
    return (
      <AuthView
        onAuthed={(u) => { setUser(u); setAuthChecked(true); }}
        onBackHome={() => setLandingView("landing")}
      />
    );
  }

  return (
    <LandingPage
      onGetStarted={() => setLandingView("auth", "register")}
      onTrack={() => setLandingView("landing")}
    />
  );
}
