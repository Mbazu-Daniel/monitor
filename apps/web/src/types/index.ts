

import type { AppRole, Priority, RequestStatus } from "@mivacampus/contracts";

export type UserRole = AppRole;
export type { Priority, RequestStatus };

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole | null;
  department?: string | null;
  phone?: string | null;
  matricNo?: string | null;
  organizationId?: string | null;
  organizationName?: string | null;
  organizationSlug?: string | null;
  organizationCode?: string | null;
  createdAt: string;
}

export interface UserRow {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string | null;
  phone: string | null;
  matricNo: string | null;
  isActive: boolean;
  createdAt: string;
  _count?: { requests: number; assignments: number };
}

export interface Category {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  _count?: { requests: number };
}

export interface AttachmentMeta {
  id: string;
  fileName: string;
  mimeType: string;
  fileUrl?: string | null;
}

export interface AssignmentRow {
  id: string;
  note: string | null;
  isActive: boolean;
  createdAt: string;
  releasedAt: string | null;
  officer: { id: string; name: string; email: string; phone: string | null; department: string | null };
  assignedByUser: { id: string; name: string };
}

export interface StatusLogRow {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  note: string | null;
  createdAt: string;
  user: { id: string; name: string; role: UserRole | null };
}

export interface CommentRow {
  id: string;
  body: string;
  createdAt: string;
  user: { id: string; name: string; role: UserRole };
}

export interface ServiceRequestRow {
  id: string;
  reference: string;
  title: string;
  description: string;
  location: string;
  priority: Priority;
  status: RequestStatus;
  createdAt: string;
  updatedAt: string;
  category: Category;
  creator: { id: string; name: string; email: string; department: string | null; matricNo: string | null };
  attachments: AttachmentMeta[];
  _count?: { comments: number };
  assignments?: AssignmentRow[];
}

export interface RequestDetail extends ServiceRequestRow {
  assignments: AssignmentRow[];
  statusLogs: StatusLogRow[];
  comments: CommentRow[];
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface NotificationRow {
  id: string;
  title: string;
  message: string;
  type: string;
  requestId: string | null;
  requestReference: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationsResponse {
  items: NotificationRow[];
  unread: number;
  total: number;
}

export interface AuditLogRow {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  details: string | null;
  createdAt: string;
  user: { id: string; name: string; role: UserRole | null } | null;
}


export interface PersonalStats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  recent: ServiceRequestRow[];
}


export interface OfficerStats {
  assignedTotal: number;
  newAssigned: number;
  inProgress: number;
  onHold: number;
  resolvedThisMonth: number;
  avgResolutionHours: number | null;
  recent: ServiceRequestRow[];
}


export interface AdminStats {
  totalRequests: number;
  byStatus: Record<RequestStatus, number>;
  byPriority: Record<Priority, number>;
  byCategory: { name: string; icon: string; count: number }[];
  unassigned: number;
  totalUsers: number;
  totalOfficers: number;
  resolvedThisMonth: number;
  avgResolutionHours: number | null;
  officerWorkload: { id: string; name: string; active: number; resolved: number }[];
  monthlyTrend: { month: string; count: number }[];
  recentActivity: AuditLogRow[];
}

