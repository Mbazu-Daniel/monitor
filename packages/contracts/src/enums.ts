export const STATUSES = ["OPEN", "ASSIGNED", "IN_PROGRESS", "ON_HOLD", "RESOLVED", "CLOSED", "REJECTED"] as const;
export type RequestStatus = (typeof STATUSES)[number];

export const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const ROLES = ["STUDENT", "STAFF", "OFFICER", "ADMIN"] as const;
export type AppRole = (typeof ROLES)[number];

export const NOTIFICATION_TYPES = ["INFO", "SUCCESS", "WARNING", "ASSIGNMENT", "STATUS", "COMMENT"] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const AUDIT_ACTIONS = [
  "REQUEST_CREATED",
  "REQUEST_UPDATED",
  "REQUEST_STATUS_CHANGED",
  "REQUEST_ASSIGNED",
  "REQUEST_UNASSIGNED",
  "REQUEST_DELETED",
  "CATEGORY_CREATED",
  "CATEGORY_UPDATED",
  "CATEGORY_DELETED",
  "USER_CREATED",
  "USER_REGISTERED",
  "USER_UPDATED",
  "PROFILE_UPDATED",
  "ORGANIZATION_CREATED",
  "MEMBER_INVITED",
  "DATA_EXPORTED",
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const API_ERROR_CODES = ["UNAUTHENTICATED", "FORBIDDEN", "NOT_FOUND", "VALIDATION", "CONFLICT", "BAD_REQUEST", "INTERNAL"] as const;
export type ApiErrorCode = (typeof API_ERROR_CODES)[number];
