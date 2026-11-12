"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "@/stores/app-store";
import { useFetch } from "@/hooks/use-fetch";
import { apiUrl } from "@/lib/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import type { NotificationsResponse } from "@/types";
import type { UserRole } from "@/types";
import {
  LayoutDashboard, FileText, PlusCircle, Users, FolderTree, BarChart3, History,
  Bell, Sun, Moon, Menu, Kanban, GraduationCap,
} from "@/components/icons";
import { OrgSwitcher } from "@/components/layout/org-switcher";
import { NavbarAccount } from "@/components/layout/navbar-account";
import { NotificationsPanel, NOTIFICATIONS_REFRESH } from "@/components/notifications/notifications-panel";
import { RequestDetailDrawer } from "@/components/requests/request-detail-drawer";
import { useViewNav, viewFromPath } from "@/lib/view-nav";
import { useRouterState } from "@tanstack/react-router";
import type { ViewKey } from "@/stores/app-store";

interface NavItem {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
  view: ViewKey;
}

const NAV_ITEMS: NavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["STUDENT", "STAFF", "OFFICER", "ADMIN"], view: "dashboard" },
  { key: "board", label: "Work board", icon: Kanban, roles: ["OFFICER", "ADMIN"], view: "board" },
  { key: "requests", label: "My Requests", icon: FileText, roles: ["STUDENT", "STAFF"], view: "requests" },
  { key: "requests", label: "Assigned Jobs", icon: FileText, roles: ["OFFICER"], view: "requests" },
  { key: "requests", label: "All Requests", icon: FileText, roles: ["ADMIN"], view: "requests" },
  { key: "new-request", label: "New Request", icon: PlusCircle, roles: ["STUDENT", "STAFF", "OFFICER", "ADMIN"], view: "new-request" },
  { key: "users", label: "Manage Users", icon: Users, roles: ["ADMIN"], view: "users" },
  { key: "students", label: "Students", icon: GraduationCap, roles: ["STAFF", "ADMIN"], view: "students" },
  { key: "categories", label: "Categories", icon: FolderTree, roles: ["ADMIN"], view: "categories" },
  { key: "reports", label: "Reports & Export", icon: BarChart3, roles: ["ADMIN"], view: "reports" },
  { key: "audit", label: "Audit Trail", icon: History, roles: ["ADMIN"], view: "audit" },
];

const DESK_VIEWS: ViewKey[] = ["dashboard", "board", "requests", "new-request"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, sidebarOpen, setSidebarOpen } = useAppStore();
  const navigate = useViewNav();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const view = (user?.organizationSlug ? viewFromPath(pathname, user.organizationSlug) : null) ?? "dashboard";
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [badgeTick, setBadgeTick] = useState(0);
  const { data: notifData } = useFetch<NotificationsResponse>("/api/notifications?pageSize=1", {
    pollMs: 60000,
    deps: [badgeTick],
  });

  useEffect(() => {
    const refresh = () => setBadgeTick((t) => t + 1);
    window.addEventListener(NOTIFICATIONS_REFRESH, refresh);
    const source = new EventSource(apiUrl("/api/realtime/stream"));
    source.onmessage = () => { window.dispatchEvent(new Event(NOTIFICATIONS_REFRESH)); };
    return () => {
      window.removeEventListener(NOTIFICATIONS_REFRESH, refresh);
      source.close();
    };
  }, []);

  if (!user) return null;

  const items = NAV_ITEMS.filter((i) => (user.role ? i.roles.includes(user.role) : false));
  const desk = items.filter((i) => DESK_VIEWS.includes(i.view));
  const manage = items.filter((i) => !DESK_VIEWS.includes(i.view));
  const currentLabel = items.find((i) => i.view === view)?.label ?? (view === "request-detail" ? "Request" : view === "settings" ? "Settings" : view === "students" ? "Students" : "Dashboard");

  const railGroup = (label: string, list: typeof items) => (
    <div key={label}>
      <p className="px-3 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">{label}</p>
      <div className="flex flex-col gap-0.5">
        {list.map((item) => {
          const isActive = item.view === view;
          return (
            <button
              key={item.key + item.label}
              onClick={() => navigate(item.view)}
              className={cn(
                "group flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13.5px] font-medium transition-all duration-150",
                isActive
                  ? "bg-night text-night-foreground shadow-[var(--shadow)]"
                  : "text-foreground/70 hover:bg-secondary hover:text-foreground"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <item.icon className={cn("h-[17px] w-[17px] shrink-0 transition-colors", isActive ? "text-night-foreground" : "text-muted-foreground group-hover:text-foreground")} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
  const navList = (
    <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-4" aria-label="Main navigation">
      {railGroup("Desk", desk)}
      {manage.length > 0 && railGroup("Manage", manage)}
    </nav>
  );

  const orgSwitch = (
    <div className="border-b border-border/70 px-4 py-4">
      <OrgSwitcher />
    </div>
  );


  return (
    <div className="flex min-h-screen flex-col bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border/70 bg-[color-mix(in_srgb,var(--bg-2)_50%,var(--bg))] lg:flex">
        {orgSwitch}
        {navList}
      </aside>

      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetTitle className="sr-only">Navigation menu</SheetTitle>
          <div className="flex h-full flex-col">
            {orgSwitch}
            {navList}
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex min-h-screen flex-1 flex-col lg:ml-64">
        <header className="sticky top-0 z-20 border-b border-border bg-[color-mix(in_srgb,var(--bg)_92%,transparent)] backdrop-blur-md">
          <div className="flex h-14 items-center justify-between gap-3 px-4 sm:px-6">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)} aria-label="Open navigation menu">
                <Menu className="h-5 w-5" />
              </Button>
              <h1 className="hidden text-[14px] font-semibold tracking-tight text-foreground sm:block">{currentLabel}</h1>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <ThemeToggle />

              <Button variant="ghost" size="icon" className="relative" onClick={() => setNotificationsOpen(true)} aria-label={`Notifications (${notifData?.unread || 0} unread)`} aria-expanded={notificationsOpen}>
                <Bell className="h-5 w-5" />
                {notifData && notifData.unread > 0 && (
                  <span
                    key={notifData.unread}
                    className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 motion-safe:animate-fade-up items-center justify-center rounded-full bg-[var(--cta)] px-1 text-[10px] font-bold text-white"
                  >
                    {notifData.unread > 99 ? "99+" : notifData.unread}
                  </span>
                )}
              </Button>
              <NavbarAccount />
            </div>
          </div>
        </header>

        <NotificationsPanel open={notificationsOpen} onOpenChange={setNotificationsOpen} />
        <RequestDetailDrawer />

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="w-full animate-fade-up">{children}</div>
        </main>
      </div>
    </div>
  );
}

function ThemeToggle() {
  const [dark, setDark] = useState(false);
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => { const next = !dark; setDark(next); document.documentElement.classList.toggle("dark", next); }}
      aria-label="Toggle dark mode"
    >
      <Sun className="h-5 w-5 hidden dark:block" />
      <Moon className="h-5 w-5 dark:hidden" />
    </Button>
  );
}
