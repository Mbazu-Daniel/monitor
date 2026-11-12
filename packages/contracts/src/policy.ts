import type { RequestStatus } from "./enums.js";

export interface PolicyActor {
  role?: string | null;
  id?: string | null;
}

export interface PolicyAssignment {
  officerId: string;
  isActive: boolean;
}

export interface PolicyRequest {
  creatorId: string;
  assignments?: readonly PolicyAssignment[] | null;
}

const isAdmin = (actor: PolicyActor): boolean => actor.role === "ADMIN";
const isCreator = (actor: PolicyActor, request: PolicyRequest): boolean =>
  !!actor.id && request.creatorId === actor.id;
const isAssignedOfficer = (actor: PolicyActor, request: PolicyRequest): boolean =>
  !!actor.id && (request.assignments ?? []).some((a) => a.isActive && a.officerId === actor.id);

export function canView(actor: PolicyActor, request: PolicyRequest): boolean {
  return isAdmin(actor) || isCreator(actor, request) || (actor.role === "OFFICER" && isAssignedOfficer(actor, request));
}

export function canAttach(actor: PolicyActor, request: PolicyRequest): boolean {
  return isAdmin(actor) || isCreator(actor, request) || isAssignedOfficer(actor, request);
}

export function canComment(actor: PolicyActor, request: PolicyRequest): boolean {
  return canView(actor, request);
}

export function canEdit(actor: PolicyActor, request: PolicyRequest, status: RequestStatus): boolean {
  return isAdmin(actor) || (isCreator(actor, request) && status === "OPEN");
}

export function canDelete(actor: PolicyActor, request: PolicyRequest, status: RequestStatus): boolean {
  return isAdmin(actor) || (isCreator(actor, request) && status === "OPEN");
}
