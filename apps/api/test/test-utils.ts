import { vi, type Mock } from "vitest";

export const openRequest = {
  id: "req-1",
  reference: "SR-5",
  title: "Broken fuse in Hostel B",
  status: "OPEN",
  priority: "HIGH",
  location: "Hostel B, block 2",
  creatorId: "member-student",
  organizationId: "org-1",
  assignments: [{ officerId: "member-officer", isActive: true }],
};

export interface Mocks {
  tx: any;
  db: any;
  notifications: { announce: Mock };
  realtime: { emit: Mock };
  attachments: { presign: Mock; deleteObjectsForRequest: Mock };
}

const memberFindUnique = vi.fn(async ({ where }: any): Promise<any> => ({ userId: `user-for-${where.id}` }));

export function makeMocks(): Mocks {
  const tx = {
    $queryRaw: vi.fn(async (): Promise<any> => [{ id: "req-1", status: "OPEN" }]),
    $executeRaw: vi.fn(async () => 1),
    organization: { update: vi.fn(async () => ({ nextRequestSeq: 2 })) },
    serviceRequest: {
      create: vi.fn(async ({ data }: any) => ({ id: "req-1", ...data, category: { name: "Electrical" } })),
      update: vi.fn(async ({ where, data }: any) => ({ id: where.id, ...data })),
      delete: vi.fn(async () => ({})),
      updateMany: vi.fn(async () => ({ count: 1 })),
    },
    statusLog: { create: vi.fn(async () => ({})) },
    assignment: {
      create: vi.fn(async ({ data }: any) => ({
        id: "asg-1",
        ...data,
        officer: { role: "OFFICER", user: { id: "user-officer", name: "Officer Ada", email: "ada@example.com", phone: null, department: "Maintenance" } },
        assignedByUser: { role: "ADMIN", user: { id: "user-admin", name: "Admin Ann" } },
      })),
      update: vi.fn(async () => ({})),
      updateMany: vi.fn(async () => ({ count: 1 })),
    },
    auditLog: { create: vi.fn(async () => ({})) },
    member: {
      findUnique: memberFindUnique,
    },
    comment: {
      create: vi.fn(async ({ data }: any) => ({
        id: "com-1",
        ...data,
        createdAt: new Date(),
        member: { role: "STUDENT", user: { id: "user-for-member-student", name: "Chidi" } },
      })),
    },
  };
  const db = {
    $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(tx)),
    $queryRaw: vi.fn(async (): Promise<any> => [{ id: "req-1", status: "OPEN" }]),
    $executeRaw: vi.fn(async () => 1),
    serviceRequest: {
      ...tx.serviceRequest,
      count: vi.fn(async () => 4),
      findUnique: vi.fn(async () => ({ ...openRequest })),
      findFirst: vi.fn(async () => ({ ...openRequest })),
    },
    statusLog: tx.statusLog,
    assignment: {
      ...tx.assignment,
      findFirst: vi.fn(async (): Promise<any> => ({ id: "asg-1", officerId: "member-officer", isActive: true })),
    },
    auditLog: tx.auditLog,
    category: {
      findUnique: vi.fn(async () => ({ id: "cat-1", name: "Electrical", organizationId: null })),
    },
    member: {
      findUnique: memberFindUnique,
      findFirst: vi.fn(async (): Promise<any> => ({
        id: "member-officer",
        user: { id: "user-officer", name: "Officer Ada", email: "ada@example.com", phone: null, department: "Maintenance", isActive: true },
      })),
    },
    comment: {
      create: vi.fn(async ({ data }: any) => ({
        id: "com-1", ...data, createdAt: new Date(),
        member: { role: "STUDENT", user: { id: "user-for-member-student", name: "Chidi" } },
      })),
    },
  };
  const notifications = { announce: vi.fn(async (_input: unknown, _audience: { userIds?: string[]; orgAdmins?: boolean }) => ({ delivered: 1 })) };
  const realtime = { emit: vi.fn() };
  const attachments = {
    presign: vi.fn(async (rows: any[]) => rows.map((r) => ({ ...r, fileUrl: null }))),
    deleteObjectsForRequest: vi.fn(async () => {}),
  };
  return { tx, db, notifications, realtime, attachments };
}
