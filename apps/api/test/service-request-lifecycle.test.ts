import { beforeEach, describe, expect, it, vi } from "vitest";
import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import type { PrismaClient } from "../src/generated/prisma/client.ts";
import { ServiceRequestLifecycleService } from "../src/requests/service-request-lifecycle.ts";
import { AuditSink } from "../src/common/utils/audit.ts";

const admin = { organizationId: "org-1", role: "ADMIN" as const, memberId: "member-admin" };
const student = { organizationId: "org-1", role: "STUDENT" as const, memberId: "member-student" };

const openRequest = {
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

function makeFakes() {
  const tx = {
    organization: { update: vi.fn(async () => ({ nextRequestSeq: 2 })) },
    serviceRequest: {
      create: vi.fn(async ({ data }: any) => ({ id: "req-1", ...data, category: { name: "Electrical" } })),
      update: vi.fn(async ({ where, data }: any) => ({ id: where.id, ...data })),
      delete: vi.fn(async () => ({})),
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
  };

  const db = {
    $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(tx)),
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
      findUnique: vi.fn(async ({ where }: any) => ({ userId: `user-for-${where.id}` })),
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
  const service = new ServiceRequestLifecycleService(
    db as unknown as PrismaClient,
    realtime as never,
    notifications as never,
    attachments as never,
    new AuditSink(),
  );
  return { service, db, tx, notifications, realtime, attachments };
}

describe("create", () => {
  it("writes the request, status log and audit in one transaction, then fans out post-commit", async () => {
    const { service, tx, db, notifications, realtime } = makeFakes();
    const result = await service.create(
      { id: "user-admin", name: "Admin Ann" },
      { title: "Broken fuse", description: "No power in block 2", location: "Hostel B", priority: "HIGH", categoryId: "cat-1" } as never,
      admin,
    );
    expect(result.request.reference).toBe("SR-1");
    expect(tx.serviceRequest.create).toHaveBeenCalledOnce();
    expect(tx.statusLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ toStatus: "OPEN", fromStatus: null }) }),
    );
    expect(tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: "REQUEST_CREATED", organizationId: "org-1" }) }),
    );
    expect(db.$transaction).toHaveBeenCalledOnce();
    expect(notifications.announce).toHaveBeenCalledTimes(2);
    expect(notifications.announce.mock.calls[0]?.[1]).toEqual({ orgAdmins: true });
    expect(realtime.emit).toHaveBeenCalledWith(expect.objectContaining({ type: "REQUEST_CREATED", organizationId: "org-1" }));
  });

  it("refuses to create without a campus and writes nothing", async () => {
    const { service, db } = makeFakes();
    await expect(
      service.create({ id: "u", name: "N" }, { categoryId: "cat-1" } as never, undefined),
    ).rejects.toThrow(BadRequestException);
    expect(db.$transaction).not.toHaveBeenCalled();
  });
});

describe("changeStatus", () => {
  it("applies a legal transition and audits inside the transaction", async () => {
    const { service, tx, notifications, realtime } = makeFakes();
    const result = await service.changeStatus(
      { id: "user-admin", name: "Admin Ann" },
      "req-1",
      { status: "IN_PROGRESS", note: "Heading over" } as never,
      admin,
    );
    expect(result.request.status).toBe("IN_PROGRESS");
    expect(tx.statusLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ fromStatus: "OPEN", toStatus: "IN_PROGRESS" }) }),
    );
    expect(tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: "REQUEST_STATUS_CHANGED" }) }),
    );
    expect(notifications.announce).toHaveBeenCalled();
    expect(realtime.emit).toHaveBeenCalledWith(expect.objectContaining({ detail: "OPEN → IN_PROGRESS" }));
  });

  it("rejects an illegal transition before touching the database", async () => {
    const { service, tx } = makeFakes();
    await expect(
      service.changeStatus({ id: "user-admin", name: "Admin Ann" }, "req-1", { status: "CLOSED" } as never, student),
    ).rejects.toThrow(ForbiddenException);
    expect(tx.serviceRequest.update).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });

  it("rejects a no-op status change", async () => {
    const { service } = makeFakes();
    await expect(
      service.changeStatus({ id: "user-admin", name: "Admin Ann" }, "req-1", { status: "OPEN" } as never, admin),
    ).rejects.toThrow(BadRequestException);
  });

  it("returns 404 for a request in another campus", async () => {
    const { service, db } = makeFakes();
    db.serviceRequest.findFirst.mockResolvedValueOnce(null as never);
    await expect(
      service.changeStatus({ id: "user-admin", name: "Admin Ann" }, "req-1", { status: "IN_PROGRESS" } as never, admin),
    ).rejects.toThrow(NotFoundException);
  });
});

describe("assign", () => {
  const assignDto = { officerId: "user-officer", note: "Please check the fuse" } as never;

  it("replaces the active assignment and moves OPEN to ASSIGNED atomically", async () => {
    const { service, tx, notifications, realtime } = makeFakes();
    const result = await service.assign({ id: "user-admin", name: "Admin Ann" }, "req-1", assignDto, admin);
    expect(tx.assignment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { requestId: "req-1", isActive: true } }),
    );
    expect(tx.assignment.create).toHaveBeenCalledOnce();
    expect(tx.serviceRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "ASSIGNED" } }),
    );
    expect(tx.statusLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ toStatus: "ASSIGNED" }) }),
    );
    expect(tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: "REQUEST_ASSIGNED" }) }),
    );
    expect(result.status).toBe("ASSIGNED");
    expect(notifications.announce).toHaveBeenCalledTimes(2);
    expect(realtime.emit).toHaveBeenCalledWith(expect.objectContaining({ type: "REQUEST_ASSIGNED" }));
  });

  it("refuses to assign a closed request", async () => {
    const { service, db } = makeFakes();
    db.serviceRequest.findFirst.mockResolvedValueOnce({ ...openRequest, status: "CLOSED" });
    await expect(service.assign({ id: "user-admin", name: "Admin Ann" }, "req-1", assignDto, admin))
      .rejects.toThrow(BadRequestException);
  });

  it("refuses an officer from outside the campus", async () => {
    const { service, db } = makeFakes();
    db.member.findFirst.mockResolvedValueOnce(null);
    await expect(service.assign({ id: "user-admin", name: "Admin Ann" }, "req-1", assignDto, admin))
      .rejects.toThrow(NotFoundException);
  });
});

describe("remove", () => {
  it("lets an admin delete an OPEN request and cleans up attachments first", async () => {
    const { service, attachments, tx } = makeFakes();
    const result = await service.remove({ id: "user-admin", name: "Admin Ann" }, "req-1", admin);
    expect(result).toEqual({ success: true });
    expect(attachments.deleteObjectsForRequest).toHaveBeenCalledWith("req-1");
    expect(tx.serviceRequest.delete).toHaveBeenCalledWith({ where: { id: "req-1" } });
    expect(tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: "REQUEST_DELETED" }) }),
    );
  });

  it("forbids a stranger from deleting the request", async () => {
    const { service } = makeFakes();
    await expect(service.remove({ id: "user-student", name: "Chidi" }, "req-1", { ...student, memberId: "member-other" }))
      .rejects.toThrow(ForbiddenException);
  });
});

describe("update", () => {
  it("lets the creator edit while the request is OPEN", async () => {
    const { service, tx } = makeFakes();
    const result = await service.update({ id: "user-student", name: "Chidi" }, "req-1", { location: "Hostel C" } as never, student);
    expect(result.request.location).toBe("Hostel C");
    expect(tx.serviceRequest.update).toHaveBeenCalledOnce();
  });

  it("keeps the creator out once the request is being processed", async () => {
    const { service, db } = makeFakes();
    db.serviceRequest.findFirst.mockResolvedValueOnce({ ...openRequest, status: "IN_PROGRESS" });
    await expect(service.update({ id: "user-student", name: "Chidi" }, "req-1", { location: "Hostel C" } as never, student))
      .rejects.toThrow(/already being processed/);
  });
});

describe("createComment", () => {
  it("notifies the creator and the active officer, excluding the author", async () => {
    const { service, notifications } = makeFakes();
    const result = await service.createComment({ id: "user-admin", name: "Admin Ann" }, "req-1", { body: "Looking into it" } as never, admin);
    expect(result.comment.body).toBe("Looking into it");
    const audiences = notifications.announce.mock.calls.map((call) => call[1]);
    expect(audiences).toHaveLength(1);
    expect(audiences[0]?.userIds).toEqual(expect.arrayContaining(["user-for-member-student", "user-for-member-officer"]));
  });
});
