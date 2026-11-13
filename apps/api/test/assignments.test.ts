import { describe, expect, it } from "vitest";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import type { PrismaClient } from "../src/generated/prisma/client.ts";
import { AssignmentsService } from "../src/requests/assignments.service.ts";
import { AuditSink } from "../src/common/audit/audit.ts";
import { openRequest, makeMocks } from "./test-utils.ts";

const admin = { organizationId: "org-1", role: "ADMIN" as const, memberId: "member-admin" };
const assignDto = { officerId: "user-officer", note: "Please check the fuse" } as never;

function makeFakes() {
  const mocks = makeMocks();
  const service = new AssignmentsService(
    mocks.db as unknown as PrismaClient,
    mocks.realtime as never,
    mocks.notifications as never,
    new AuditSink(),
  );
  return { service, ...mocks };
}

describe("assign", () => {
  it("replaces the active assignment and moves OPEN to ASSIGNED atomically", async () => {
    const { service, tx, notifications, realtime } = makeFakes();
    const result = await service.assign({ id: "user-admin", name: "Admin Ann" }, "req-1", assignDto, admin);
    expect(tx.assignment.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { requestId: "req-1", isActive: true } }));
    expect(tx.assignment.create).toHaveBeenCalledOnce();
    expect(tx.serviceRequest.update).toHaveBeenCalledWith(expect.objectContaining({ data: { status: "ASSIGNED" } }));
    expect(tx.statusLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ toStatus: "ASSIGNED" }) }));
    expect(result.status).toBe("ASSIGNED");
    expect(notifications.announce).toHaveBeenCalledTimes(2);
    expect(realtime.emit).toHaveBeenCalledWith(expect.objectContaining({ type: "REQUEST_ASSIGNED" }));
  });

  it("refuses to assign a closed request", async () => {
    const { service, db } = makeFakes();
    db.serviceRequest.findFirst.mockResolvedValueOnce({ ...openRequest, status: "CLOSED" });
    await expect(service.assign({ id: "user-admin", name: "Admin Ann" }, "req-1", assignDto, admin)).rejects.toThrow(BadRequestException);
  });

  it("refuses an officer from outside the campus", async () => {
    const { service, db } = makeFakes();
    db.member.findFirst.mockResolvedValueOnce(null);
    await expect(service.assign({ id: "user-admin", name: "Admin Ann" }, "req-1", assignDto, admin)).rejects.toThrow(NotFoundException);
  });
});

describe("unassign", () => {
  it("releases the active assignment and re-queues the request", async () => {
    const { service, tx, realtime } = makeFakes();
    const result = await service.unassign({ id: "user-admin", name: "Admin Ann" }, "req-1", admin);
    expect(result).toEqual({ success: true });
    expect(tx.assignment.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "asg-1" } }));
    expect(tx.serviceRequest.update).toHaveBeenCalledWith(expect.objectContaining({ data: { status: "OPEN" } }));
    expect(realtime.emit).toHaveBeenCalledWith(expect.objectContaining({ type: "REQUEST_UNASSIGNED" }));
  });

  it("refuses when there is no active assignment", async () => {
    const { service, db } = makeFakes();
    db.assignment.findFirst.mockResolvedValueOnce(null);
    await expect(service.unassign({ id: "user-admin", name: "Admin Ann" }, "req-1", admin)).rejects.toThrow(BadRequestException);
  });
});
