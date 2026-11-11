"use client";

import { create } from "zustand";

export type ViewKey =
  | "dashboard"
  | "requests" // list (scoped by role: my requests / assigned / all)
  | "new-request"
  | "request-detail"
  | "users"
  | "categories"
  | "reports"
  | "audit"
  | "api-docs"
  | "profile";

interface AppState {
  user: import("@/types").SessionUser | null;
  authChecked: boolean;
  view: ViewKey;
  requestId: string | null;
  sidebarOpen: boolean;
  requestListFilter: { status?: string; priority?: string; categoryId?: string; search?: string } | null;
  // Landing vs auth view (for unauthenticated users)
  landingView: "landing" | "auth";
  authInitialTab: "login" | "register";

  setUser: (u: import("@/types").SessionUser | null) => void;
  setAuthChecked: (v: boolean) => void;
  navigate: (view: ViewKey, requestId?: string | null) => void;
  setSidebarOpen: (v: boolean) => void;
  setRequestListFilter: (f: AppState["requestListFilter"]) => void;
  setLandingView: (v: "landing" | "auth", tab?: "login" | "register") => void;
  reset: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  authChecked: false,
  view: "dashboard",
  requestId: null,
  sidebarOpen: false,
  requestListFilter: null,
  landingView: "landing",
  authInitialTab: "register",

  setUser: (user) => set({ user }),
  setAuthChecked: (authChecked) => set({ authChecked }),
  navigate: (view, requestId = null) => set({ view, requestId, sidebarOpen: false }),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setRequestListFilter: (requestListFilter) => set({ requestListFilter }),
  setLandingView: (landingView, tab) =>
    set(landingView === "auth" ? { landingView, authInitialTab: tab ?? "register" } : { landingView }),
  reset: () => set({ user: null, view: "dashboard", requestId: null, sidebarOpen: false, landingView: "landing" }),
}));
