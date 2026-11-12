"use client";

import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAppStore } from "@/stores/app-store";
import { useEnsureSession } from "@/lib/use-ensure-session";
import { AuthView } from "@/components/auth/auth-view";
import { Splash } from "@/components/layout/splash";
import { LandingPage } from "@/pages/landing-page";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const { user, authChecked, landingView, setUser, setAuthChecked, setLandingView } = useAppStore();
  useEnsureSession();

  if (!authChecked) {
    return <Splash />;
  }

  if (user) {
    return user.organizationCode ? (
      <Navigate to="/$orgSlug" params={{ orgSlug: user.organizationCode }} replace />
    ) : (
      <Navigate to="/onboarding" replace />
    );
  }

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
      onSignIn={() => setLandingView("auth", "login")}
    />
  );
}
