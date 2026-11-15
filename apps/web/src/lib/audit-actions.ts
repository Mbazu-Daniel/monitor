import type { AuditAction } from "@mivacampus/contracts";

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  USER_LOGIN: "Signed in",
  USER_REGISTERED: "User registered",
  USER_CREATED: "User created",
  USER_UPDATED: "User updated",
  PROFILE_UPDATED: "Profile updated",
  REQUEST_CREATED: "Request created",
  REQUEST_UPDATED: "Request updated",
  REQUEST_STATUS_CHANGED: "Status changed",
  REQUEST_ASSIGNED: "Request assigned",
  REQUEST_UNASSIGNED: "Request unassigned",
  REQUEST_DELETED: "Request deleted",
  CATEGORY_CREATED: "Category created",
  CATEGORY_UPDATED: "Category updated",
  CATEGORY_DELETED: "Category deleted",
  ORGANIZATION_CREATED: "Campus created",
  ORGANIZATION_UPDATED: "Campus updated",
  MEMBER_INVITED: "Member invited",
  DATA_EXPORTED: "Data exported",
};
