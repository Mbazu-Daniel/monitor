"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Priority, RequestStatus, UserRole } from "@/types";

export const STATUS_META: Record<RequestStatus, { label: string; className: string; dot: string }> = {
  OPEN: { label: "Open", className: "border-transparent bg-secondary text-secondary-foreground", dot: "bg-foreground/50" },
  ASSIGNED: { label: "Assigned", className: "border-transparent bg-blue-soft text-blue-deep", dot: "bg-blue" },
  IN_PROGRESS: { label: "In progress", className: "border-transparent bg-[var(--accent-soft)] text-[var(--accent-deep)]", dot: "bg-[var(--accent)]" },
  ON_HOLD: { label: "On hold", className: "border-foreground/40 text-foreground/70 border-dashed", dot: "bg-foreground/50" },
  RESOLVED: { label: "Resolved", className: "border-transparent bg-green-soft text-green-deep", dot: "bg-green" },
  CLOSED: { label: "Closed", className: "border-transparent bg-secondary text-muted-foreground", dot: "bg-muted-foreground" },
  REJECTED: { label: "Rejected", className: "border-transparent bg-red-soft text-red", dot: "bg-red" },
};

export const PRIORITY_META: Record<Priority, { label: string; className: string }> = {
  LOW: { label: "Low", className: "border-transparent bg-secondary text-muted-foreground" },
  MEDIUM: { label: "Medium", className: "border-transparent bg-secondary text-foreground" },
  HIGH: { label: "High", className: "border-transparent bg-blue-soft text-blue-deep" },
  URGENT: { label: "Urgent", className: "border-transparent bg-[var(--accent-soft)] text-[var(--accent-deep)] font-semibold" },
};

export const ROLE_META: Record<UserRole, { label: string; className: string }> = {
  STUDENT: { label: "Student", className: "border-transparent bg-secondary text-muted-foreground" },
  STAFF: { label: "Staff", className: "border-transparent bg-secondary text-foreground" },
  OFFICER: { label: "Officer", className: "border-transparent bg-blue-soft text-blue-deep" },
  ADMIN: { label: "Admin", className: "border-transparent bg-night text-night-foreground" },
};

export function formatStatus(status: string): string {
  const meta = STATUS_META[status as RequestStatus];
  if (meta) return meta.label;
  const words = status.replace(/_/g, " ").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function StatusBadge({ status, className }: { status: RequestStatus; className?: string }) {
  const meta = STATUS_META[status] || STATUS_META.OPEN;
  return (
    <Badge variant="outline" className={cn("gap-1.5 font-medium", meta.className, className)}>
      <span className={cn("size-1.5 rounded-full", meta.dot)} />
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

export function RoleBadge({ role, className }: { role: UserRole | null; className?: string }) {
  if (!role || !ROLE_META[role]) return null;
  const meta = ROLE_META[role];
  return (
    <Badge variant="outline" className={cn("font-medium", meta.className, className)}>
      {meta.label}
    </Badge>
  );
}
