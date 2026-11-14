import { describe, expect, it } from "vitest";
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";
import type { PrismaClient } from "../src/generated/prisma/client.ts";
import { StatusChangeService } from "../src/requests/status-change.service.ts";
import { AuditSink } from "../src/common/audit/audit.ts";
import { openRequest, makeMocks } from "./test-utils.ts";

const admin = { organizationId: "org-1", role: "ADMIN" as const, memberId: "member-admin" };
const student = { organizationId: "org-1", role: "STUDENT" as const, memberId: "member-student" };

function makeFakes() {
  const mocks = makeMocks();
  const service = new StatusChangeService(
    mocks.db as unknown as PrismaClient,
    mocks.realtime as never,
    mocks.notifications as never,
    new AuditSink(),
  );
  return { service, ...mocks };
}

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
    expect(tx.statusLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ fromStatus: "OPEN", toStatus: "IN_PROGRESS" }) }));
    expect(notifications.announce).toHaveBeenCalled();
    expect(realtime.emit).toHaveBeenCalledWith(expect.objectContaining({ detail: "OPEN → IN_PROGRESS" }));
  });

  it("rejects an illegal transition before touching the database", async () => {
    const { service, tx } = makeFakes();
    await expect(
      service.changeStatus({ id: "user-admin", name: "Admin Ann" }, "req-1", { status: "CLOSED" } as never, student),
    ).rejects.toThrow(ForbiddenException);
    expect(tx.serviceRequest.update).not.toHaveBeenCalled();
    expect(tx.statusLog.create).not.toHaveBeenCalled();
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

  it("returns 409 when the status changed underneath us", async () => {
    const { service, tx } = makeFakes();
    tx.serviceRequest.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(
      service.changeStatus({ id: "user-admin", name: "Admin Ann" }, "req-1", { status: "IN_PROGRESS" } as never, admin),
    ).rejects.toThrow(ConflictException);
    expect(tx.statusLog.create).not.toHaveBeenCalled();
  });
});
