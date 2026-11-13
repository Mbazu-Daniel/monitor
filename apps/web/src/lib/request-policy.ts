import { XCircle, PauseCircle, CheckCircle2, Lock, PlayCircle, Zap } from "@/components/icons";
import { nextActionsFor, canDelete as policyCanDelete, canComment as policyCanComment, type RequestStatus } from "@mivacampus/contracts";
import type { ComponentType } from "react";
import type { RequestDetail, AssignmentRow, UserRole } from "@/types";

const ACTION_ICONS: Record<RequestStatus, ComponentType<{ className?: string }>> = {
  REJECTED: XCircle,
  ON_HOLD: PauseCircle,
  RESOLVED: CheckCircle2,
  CLOSED: Lock,
  OPEN: PlayCircle,
  IN_PROGRESS: Zap,
  ASSIGNED: PlayCircle,
};

const labelIcon = (label: string, to: RequestStatus) => {
  if (label.startsWith("Resume") || label === "Reopen") return PlayCircle;
  return ACTION_ICONS[to];
};

function actionsFor(role: UserRole | null | undefined, isCreator: boolean, isAssignedOfficer: boolean, status: RequestStatus) {
  return nextActionsFor({ role: role ?? null, isCreator, isAssignedOfficer }, status)
    .map((a) => ({ ...a, icon: labelIcon(a.label, a.to) }));
}

type PolicyUser = { role?: UserRole | null; id?: string | null } | null;

export function computePolicy(user: PolicyUser, r: RequestDetail) {
  const activeAssignment = r.assignments.find((a: AssignmentRow) => a.isActive) ?? null;
  const isCreator = user?.id === r.creator.id;
  const isAssignedOfficer = user?.role === "OFFICER" && activeAssignment?.officer.id === user?.id;
  const policyActor = { role: user?.role ?? null, id: user?.id ?? null };
  const policyRequest = {
    creatorId: r.creator.id,
    assignments: r.assignments.map((a) => ({ officerId: a.officer.id, isActive: a.isActive })),
  };
  return {
    activeAssignment,
    isAdmin: user?.role === "ADMIN",
    actions: user ? actionsFor(user.role, isCreator, !!isAssignedOfficer, r.status) : [],
    canDelete: user ? policyCanDelete(policyActor, policyRequest, r.status) : false,
    canComment: user ? policyCanComment(policyActor, policyRequest) : false,
  };
}

export type DetailAction = ReturnType<typeof actionsFor>[number];
