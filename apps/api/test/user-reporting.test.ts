import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "../src/generated/prisma/client.ts";
import { UserReportingService } from "../src/users/user-reporting.ts";

const row = (id: string, memberId: string, role: string, name = id) => ({
  id,
  name,
  email: `${id}@miva.edu`,
  department: "Registry",
  phone: null,
  matricNo: null,
  isActive: true,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  memberships: [{ id: memberId, role }],
});

function makeDb(overrides: { count?: number; findMany?: unknown[]; requestCounts?: { creatorId: string; _count: { _all: number } }[]; assignmentCounts?: { officerId: string; _count: { _all: number } }[] } = {}) {
  const db = {
    user: {
      count: vi.fn(async () => overrides.count ?? 2),
      findMany: vi.fn(async (_args?: any) => overrides.findMany ?? [row("u-1", "member-1", "STAFF"), row("u-2", "member-2", "STUDENT")]),
    },
    serviceRequest: { groupBy: vi.fn(async () => overrides.requestCounts ?? [{ creatorId: "member-1", _count: { _all: 3 } }]) },
    assignment: { groupBy: vi.fn(async () => overrides.assignmentCounts ?? [{ officerId: "member-1", _count: { _all: 2 } }]) },
  };
  return db;
}

const makeService = (db: ReturnType<typeof makeDb>) => new UserReportingService(db as unknown as PrismaClient);

describe("list", () => {
  it("reports request and assignment counts per member", async () => {
    const db = makeDb();
    const service = makeService(db);
    const result = await service.list({}, "org-1");
    expect(result.items).toHaveLength(2);
    expect(result.items[0]?._count).toEqual({ requests: 3, assignments: 2 });
    expect(result.items[1]?._count).toEqual({ requests: 0, assignments: 0 });
    expect(result.items[0]?.role).toBe("STAFF");
  });

  it("forces the STUDENT role filter for staff actors", async () => {
    const db = makeDb();
    const service = makeService(db);
    await service.list({ role: "ADMIN" }, "org-1", "STAFF");
    const and = (db.user.findMany.mock.calls[0]?.[0] as any).where.AND;
    expect(and.at(-1)).toEqual({ memberships: { some: { organizationId: "org-1", role: "STUDENT" } } });
  });

  it("skips the aggregate queries when nobody matches", async () => {
    const db = makeDb({ count: 0, findMany: [] });
    const service = makeService(db);
    const result = await service.list({}, "org-1");
    expect(result.items).toEqual([]);
    expect(db.serviceRequest.groupBy).not.toHaveBeenCalled();
    expect(db.assignment.groupBy).not.toHaveBeenCalled();
  });

  it("computes total pages from the count", async () => {
    const db = makeDb({ count: 25 });
    const service = makeService(db);
    const result = await service.list({ page: 2, pageSize: 10 }, "org-1");
    expect(result.totalPages).toBe(3);
    expect(result.page).toBe(2);
  });
});
