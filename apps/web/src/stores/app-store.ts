import { create } from "zustand";

export type ViewKey =
  | "dashboard"
  | "board"
  | "requests"
  | "new-request"
  | "request-detail"
  | "users"
  | "students"
  | "categories"
  | "reports"
  | "audit"
  | "settings";

interface AppState {
  user: import("@/types").SessionUser | null;
  authChecked: boolean;
  sidebarOpen: boolean;
  detailReference: string | null;

  landingView: "landing" | "auth";
  authInitialTab: "login" | "register";

  setUser: (u: import("@/types").SessionUser | null) => void;
  setAuthChecked: (v: boolean) => void;
  setSidebarOpen: (v: boolean) => void;
  openDetail: (reference: string) => void;
  closeDetail: () => void;
  setLandingView: (v: "landing" | "auth", tab?: "login" | "register") => void;
  reset: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  authChecked: false,
  sidebarOpen: false,
  detailReference: null,
  landingView: "landing",
  authInitialTab: "register",

  setUser: (user) => set({ user }),
  setAuthChecked: (authChecked) => set({ authChecked }),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  openDetail: (detailReference) => set({ detailReference }),
  closeDetail: () => set({ detailReference: null }),
  setLandingView: (landingView, tab) =>
    set(landingView === "auth" ? { landingView, authInitialTab: tab ?? "register" } : { landingView }),
  reset: () => set({ user: null, sidebarOpen: false, detailReference: null, landingView: "landing" }),
}));
