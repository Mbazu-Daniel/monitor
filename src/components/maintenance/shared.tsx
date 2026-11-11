"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Wrench, Zap, Droplets, Armchair, Wifi, Monitor, Building2, HardHat, SprayCan,
  DoorOpen, Paintbrush, Settings, LucideIcon,
} from "lucide-react";
import type { Priority, RequestStatus, UserRole } from "@/types";

// ---------- Status / Priority / Role styling ----------

export const STATUS_META: Record<RequestStatus, { label: string; className: string; dot: string }> = {
  OPEN: { label: "Open", className: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700", dot: "bg-slate-400" },
  ASSIGNED: { label: "Assigned", className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-900", dot: "bg-amber-500" },
  IN_PROGRESS: { label: "In Progress", className: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-900", dot: "bg-teal-500" },
  ON_HOLD: { label: "On Hold", className: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-900", dot: "bg-orange-500" },
  RESOLVED: { label: "Resolved", className: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900", dot: "bg-emerald-500" },
  CLOSED: { label: "Closed", className: "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700", dot: "bg-zinc-400" },
  REJECTED: { label: "Rejected", className: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-900", dot: "bg-red-500" },
};

export const PRIORITY_META: Record<Priority, { label: string; className: string }> = {
  LOW: { label: "Low", className: "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700" },
  MEDIUM: { label: "Medium", className: "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/60 dark:text-yellow-300 dark:border-yellow-900" },
  HIGH: { label: "High", className: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-900" },
  URGENT: { label: "Urgent", className: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-900" },
};

export const ROLE_META: Record<UserRole, { label: string; className: string }> = {
  STUDENT: { label: "Student", className: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-900" },
  STAFF: { label: "Staff", className: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/60 dark:text-violet-300 dark:border-violet-900" },
  OFFICER: { label: "Officer", className: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900" },
  ADMIN: { label: "Admin", className: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-900" },
};

export function StatusBadge({ status, className }: { status: RequestStatus; className?: string }) {
  const meta = STATUS_META[status] || STATUS_META.OPEN;
  return (
    <Badge variant="outline" className={cn("gap-1.5 font-medium", meta.className, className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
      {meta.label}
    </Badge>
  );
}

export function PriorityBadge({ priority, className }: { priority: Priority; className?: string }) {
  const meta = PRIORITY_META[priority] || PRIORITY_META.MEDIUM;
  return (
    <Badge variant="outline" className={cn("font-medium", meta.className, className)}>
      {meta.label}
    </Badge>
  );
}

export function RoleBadge({ role, className }: { role: UserRole; className?: string }) {
  const meta = ROLE_META[role] || ROLE_META.STUDENT;
  return (
    <Badge variant="outline" className={cn("font-medium", meta.className, className)}>
      {meta.label}
    </Badge>
  );
}

// ---------- Category icons ----------

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Wrench, Zap, Droplets, Armchair, Wifi, Monitor, Building2, HardHat, SprayCan, DoorOpen, Paintbrush, Settings,
};

export const CATEGORY_ICON_KEYS = Object.keys(CATEGORY_ICONS);

export function CategoryIcon({ icon, className }: { icon: string; className?: string }) {
  const Icon = CATEGORY_ICONS[icon] || Wrench;
  return <Icon className={cn("h-4 w-4", className)} />;
}

// ---------- Stat card ----------

export function StatCard({
  title, value, icon: Icon, tone = "emerald", sub,
}: {
  title: string;
  value: string | number;
  icon: LucideIcon;
  tone?: "emerald" | "amber" | "teal" | "red" | "zinc" | "violet";
  sub?: string;
}) {
  const tones: Record<string, string> = {
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400",
    teal: "bg-teal-50 text-teal-600 dark:bg-teal-950/60 dark:text-teal-400",
    red: "bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-400",
    zinc: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
    violet: "bg-violet-50 text-violet-600 dark:bg-violet-950/60 dark:text-violet-400",
  };
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground sm:text-[13px]">{title}</p>
          <p className="mt-1.5 text-2xl font-bold tabular-nums sm:text-3xl">{value}</p>
          {sub ? <p className="mt-1 truncate text-xs text-muted-foreground">{sub}</p> : null}
        </div>
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", tones[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

// ---------- Small helpers ----------

export function timeAgo(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("");
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  const colors = ["bg-emerald-600", "bg-teal-600", "bg-amber-600", "bg-violet-600", "bg-rose-600", "bg-cyan-700"];
  const idx = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % colors.length;
  return (
    <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white", colors[idx], className)}>
      {initials(name) || "?"}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }: { icon: LucideIcon; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card/50 px-6 py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-sm font-semibold">{title}</h3>
      {description ? <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function PageHeader({ title, description, children }: { title: string; description?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
    </div>
  );
}
