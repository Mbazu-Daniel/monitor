import type { AppRole, RequestStatus } from "./enums.js";

export const TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  OPEN: ["ASSIGNED", "IN_PROGRESS", "REJECTED"],
  ASSIGNED: ["IN_PROGRESS", "ON_HOLD", "REJECTED", "OPEN"],
  IN_PROGRESS: ["ON_HOLD", "RESOLVED", "REJECTED"],
  ON_HOLD: ["IN_PROGRESS", "RESOLVED", "REJECTED"],
  RESOLVED: ["CLOSED", "IN_PROGRESS"],
  CLOSED: ["OPEN"],
  REJECTED: ["OPEN"],
};

export function canTransition(from: RequestStatus, to: RequestStatus): boolean {
  return (TRANSITIONS[from] ?? []).includes(to);
}

export interface WorkflowActor {
  role: AppRole | "STUDENT" | null | undefined;
  isAssignedOfficer: boolean;
  isCreator: boolean;
}

export function permissionError(actor: WorkflowActor, from: RequestStatus, to: RequestStatus): string | null {
  if (!canTransition(from, to)) return `Cannot change status from ${from} to ${to}.`;
  if (actor.role === "ADMIN") return null;
  if (to === "CLOSED") {
    return actor.isCreator && from === "RESOLVED"
      ? null
      : "Only the request owner can close a resolved request, or an administrator.";
  }
  if (actor.role === "OFFICER") {
    if (!actor.isAssignedOfficer) return "You can only update requests assigned to you.";
    const allowed: RequestStatus[] = ["IN_PROGRESS", "ON_HOLD", "RESOLVED"];
    if (allowed.includes(to)) return null;
    return "Maintenance officers can set In progress, On hold or Resolved.";
  }
  return "You do not have permission to change this request's status.";
}

export type WorkflowTone = "default" | "outline" | "destructive";
export interface WorkflowAction {
  to: RequestStatus;
  label: string;
  tone: WorkflowTone;
  requires: "assignedOfficer" | "creator" | null;
}

const ADMIN_ACTIONS: Partial<Record<RequestStatus, WorkflowAction[]>> = {
  OPEN: [{ to: "REJECTED", label: "Reject", tone: "destructive", requires: null }],
  ASSIGNED: [
    { to: "IN_PROGRESS", label: "Start Work", tone: "default", requires: null },
    { to: "ON_HOLD", label: "Hold", tone: "outline", requires: null },
    { to: "REJECTED", label: "Reject", tone: "destructive", requires: null },
  ],
  IN_PROGRESS: [
    { to: "RESOLVED", label: "Mark Resolved", tone: "default", requires: null },
    { to: "ON_HOLD", label: "Hold", tone: "outline", requires: null },
    { to: "REJECTED", label: "Reject", tone: "destructive", requires: null },
  ],
  ON_HOLD: [
    { to: "IN_PROGRESS", label: "Resume work", tone: "default", requires: null },
    { to: "RESOLVED", label: "Mark Resolved", tone: "default", requires: null },
    { to: "REJECTED", label: "Reject", tone: "destructive", requires: null },
  ],
  RESOLVED: [
    { to: "CLOSED", label: "Close Request", tone: "default", requires: null },
    { to: "IN_PROGRESS", label: "Reopen", tone: "outline", requires: null },
  ],
  CLOSED: [{ to: "OPEN", label: "Reopen", tone: "outline", requires: null }],
  REJECTED: [{ to: "OPEN", label: "Reopen", tone: "outline", requires: null }],
};

const OFFICER_ACTIONS: Partial<Record<RequestStatus, WorkflowAction[]>> = {
  ASSIGNED: [
    { to: "IN_PROGRESS", label: "Start Work", tone: "default", requires: "assignedOfficer" },
    { to: "ON_HOLD", label: "Hold", tone: "outline", requires: "assignedOfficer" },
  ],
  IN_PROGRESS: [
    { to: "RESOLVED", label: "Mark Resolved", tone: "default", requires: "assignedOfficer" },
    { to: "ON_HOLD", label: "Hold", tone: "outline", requires: "assignedOfficer" },
  ],
  ON_HOLD: [{ to: "IN_PROGRESS", label: "Resume work", tone: "default", requires: "assignedOfficer" }],
  RESOLVED: [{ to: "IN_PROGRESS", label: "Reopen", tone: "outline", requires: "assignedOfficer" }],
};

export function nextActionsFor(actor: WorkflowActor, status: RequestStatus): WorkflowAction[] {
  if (actor.role === "ADMIN") return ADMIN_ACTIONS[status] ?? [];
  if (actor.role === "OFFICER" && actor.isAssignedOfficer) return OFFICER_ACTIONS[status] ?? [];
  if (actor.isCreator && status === "RESOLVED") {
    return [{ to: "CLOSED", label: "Confirm Fixed & Close", tone: "default", requires: "creator" }];
  }
  return [];
}
