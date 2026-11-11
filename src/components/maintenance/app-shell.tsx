"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { useAppStore } from "@/stores/app-store";
import { useFetch } from "@/hooks/use-fetch";
import { api } from "@/lib/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, RoleBadge, timeAgo } from "@/components/maintenance/shared";
import type { NotificationsResponse } from "@/types";
import type { UserRole } from "@/types";
import {
  LayoutDashboard, FileText, PlusCircle, Users, FolderTree, BarChart3, History,
  BookOpen, UserCircle, LogOut, Bell, Wrench, Sun, Moon, Menu, Inbox, CheckCheck,
} from "lucide-react";

interface NavItem {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
  view: Parameters<ReturnType<typeof useAppStore.getState>["navigate"]>[0];
}

const NAV_ITEMS: NavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["STUDENT", "STAFF", "OFFICER", "ADMIN"], view: "dashboard" },
  { key: "requests", label: "My Requests", icon: FileText, roles: ["STUDENT", "STAFF"], view: "requests" },
  { key: "requests", label: "Assigned Jobs", icon: FileText, roles: ["OFFICER"], view: "requests" },
  { key: "requests", label: "All Requests", icon: FileText, roles: ["ADMIN"], view: "requests" },
  { key: "new-request", label: "New Request", icon: PlusCircle, roles: ["STUDENT", "STAFF", "OFFICER", "ADMIN"], view: "new-request" },
  { key: "users", label: "Manage Users", icon: Users, roles: ["ADMIN"], view: "users" },
  { key: "categories", label: "Categories", icon: FolderTree, roles: ["ADMIN"], view: "categories" },
  { key: "reports", label: "Reports & Export", icon: BarChart3, roles: ["ADMIN"], view: "reports" },
  { key: "audit", label: "Audit Trail", icon: History, roles: ["ADMIN"], view: "audit" },
  { key: "api-docs", label: "API Docs", icon: BookOpen, roles: ["ADMIN"], view: "api-docs" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, view, navigate, sidebarOpen, setSidebarOpen } = useAppStore();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { data: notifData, refetch: refetchNotifs } = useFetch<NotificationsResponse>("/api/notifications?pageSize=10", {
    pollMs: 15000,
  });

  if (!user) return null;

  const items = NAV_ITEMS.filter((i) => i.roles.includes(user.role));
  const activeKeys = new Set(items.filter((i) => i.view === view).map((i) => i.key));

  const navList = (
    <nav className="flex flex-1 flex-col gap-1 px-3" aria-label="Main navigation">
      {items.map((item) => {
        const active = activeKeys.has(item.key) && !!items.find((i) => i.key === item.key && i.view === view);
        const isActive = item.view === view;
        return (
          <button
            key={item.key + item.label}
            onClick={() => navigate(item.view)}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
            aria-current={isActive ? "page" : undefined}
          >
            <item.icon className="h-[18px] w-[18px] shrink-0" />
            {item.label}
          </button>
        );
      })}
    </nav>
  );

  const brand = (
    <div className="flex items-center gap-2.5 px-5 py-5">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <Wrench className="h-5 w-5" />
      </div>
      <div className="leading-tight">
        <p className="text-sm font-bold">FixCampus</p>
        <p className="text-[11px] text-muted-foreground">Maintenance Service</p>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      {/* Sidebar — desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r bg-sidebar lg:flex">
        {brand}
        {navList}
        <div className="border-t p-4 text-[11px] leading-relaxed text-muted-foreground">
          Signed in as <span className="font-medium text-foreground">{user.name}</span>
          <br />
          {user.email}
        </div>
      </aside>

      {/* Mobile drawer */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetTitle className="sr-only">Navigation menu</SheetTitle>
          {brand}
          <div className="flex h-[calc(100%-76px)] flex-col">
            {navList}
          </div>
        </SheetContent>
      </Sheet>

      {/* Main column */}
      <div className="flex min-h-screen flex-1 flex-col lg:ml-64">
        {/* Header */}
        <header className="sticky top-0 z-20 border-b bg-background/85 backdrop-blur">
          <div className="flex h-14 items-center justify-between gap-3 px-4 sm:px-6">
            <div className="flex items-center gap-2">
              <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation menu">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
              </Sheet>
              <div className="hidden items-center gap-2 sm:flex">
                <Inbox className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">
                  {items.find((i) => i.view === view)?.label || "Dashboard"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Theme toggle */}
              <ThemeToggle />

              {/* Notifications */}
              <DropdownMenu open={notificationsOpen} onOpenChange={setNotificationsOpen}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative" aria-label={`Notifications (${notifData?.unread || 0} unread)`}>
                    <Bell className="h-5 w-5" />
                    {notifData && notifData.unread > 0 && (
                      <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                        {notifData.unread > 99 ? "99+" : notifData.unread}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80 max-w-[calc(100vw-2rem)]">
                  <div className="flex items-center justify-between px-2 py-1.5">
                    <p className="text-sm font-semibold">Notifications</p>
                    {notifData && notifData.unread > 0 && (
                      <button
                        className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                        onClick={async () => {
                          await api("/api/notifications/read-all", { method: "POST" });
                          refetchNotifs();
                        }}
                      >
                        <CheckCheck className="h-3.5 w-3.5" /> Mark all read
                      </button>
                    )}
                  </div>
                  <DropdownMenuSeparator />
                  <div className="max-h-80 overflow-y-auto">
                    {!notifData || notifData.items.length === 0 ? (
                      <p className="px-3 py-8 text-center text-sm text-muted-foreground">No notifications yet.</p>
                    ) : (
                      notifData.items.map((n) => (
                        <button
                          key={n.id}
                          className={cn(
                            "flex w-full flex-col gap-0.5 border-b px-3 py-2.5 text-left transition-colors last:border-0 hover:bg-accent",
                            !n.isRead && "bg-emerald-50/60 dark:bg-emerald-950/30"
                          )}
                          onClick={async () => {
                            if (!n.isRead) {
                              await api(`/api/notifications/${n.id}/read`, { method: "POST" });
                              refetchNotifs();
                            }
                            if (n.requestId) {
                              setNotificationsOpen(false);
                              navigate("request-detail", n.requestId);
                            }
                          }}
                        >
                          <span className="flex items-center gap-2 text-[13px] font-semibold leading-snug">
                            {!n.isRead && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />}
                            {n.title}
                          </span>
                          <span className="line-clamp-2 text-xs text-muted-foreground">{n.message}</span>
                          <span className="text-[11px] text-muted-foreground/70">{timeAgo(n.createdAt)}</span>
                        </button>
                      ))
                    )}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* User menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 rounded-full outline-none ring-primary focus-visible:ring-2" aria-label="Account menu">
                    <Avatar name={user.name} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60">
                  <DropdownMenuLabel>
                    <p className="truncate text-sm font-semibold">{user.name}</p>
                    <p className="truncate text-xs font-normal text-muted-foreground">{user.email}</p>
                    <div className="mt-1.5"><RoleBadge role={user.role} /></div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("profile")}>
                    <UserCircle className="mr-2 h-4 w-4" /> My Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={async () => {
                      await api("/api/auth/logout", { method: "POST" });
                      useAppStore.getState().reset();
                      window.location.reload();
                    }}
                    className="text-destructive focus:text-destructive"
                  >
                    <LogOut className="mr-2 h-4 w-4" /> Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-6xl animate-fade-up">{children}</div>
        </main>

        {/* Sticky footer */}
        <footer className="mt-auto border-t bg-background">
          <div className="flex flex-col items-center justify-between gap-1 px-4 py-3 text-xs text-muted-foreground sm:flex-row sm:px-6">
            <p>FixCampus — University Maintenance Service System</p>
            <p>Keeping campus facilities working, one request at a time.</p>
          </div>
        </footer>
      </div>
    </div>
  );
}

function ThemeToggle() {
  const { setTheme } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(document.documentElement.classList.contains("dark") ? "light" : "dark")}
      aria-label="Toggle dark mode"
    >
      <Sun className="h-5 w-5 hidden dark:block" />
      <Moon className="h-5 w-5 dark:hidden" />
    </Button>
  );
}
