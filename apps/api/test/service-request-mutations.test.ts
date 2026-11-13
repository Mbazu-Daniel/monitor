import { describe, expect, it } from "vitest";
import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import type { PrismaClient } from "../src/generated/prisma/client.ts";
import { RequestMutationsService } from "../src/requests/service-request-mutations.service.ts";
import { AuditSink } from "../src/common/audit/audit.ts";
import { openRequest, makeMocks } from "./test-utils.ts";

const admin = { organizationId: "org-1", role: "ADMIN" as const, memberId: "member-admin" };
const student = { organizationId: "org-1", role: "STUDENT" as const, memberId: "member-student" };

function makeFakes() {
  const mocks = makeMocks();
  const service = new RequestMutationsService(
    mocks.db as unknown as PrismaClient,
    mocks.realtime as never,
    mocks.notifications as never,
    mocks.attachments as never,
    new AuditSink(),
  );
  return { service, ...mocks };
}

describe("create", () => {
  it("writes the request, status log and audit in one transaction, then fans out post-commit", async () => {
    const { service, tx, notifications, realtime } = makeFakes();
    const result = await service.create(
      { id: "user-admin", name: "Admin Ann" },
      { title: "Broken fuse", description: "No power in block 2", location: "Hostel B", priority: "HIGH", categoryId: "cat-1" } as never,
      admin,
    );
    expect(result.request.reference).toBe("SR-1");
    expect(tx.serviceRequest.create).toHaveBeenCalledOnce();
    expect(tx.statusLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ toStatus: "OPEN" }) }));
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

describe("remove", () => {
  it("lets an admin delete an OPEN request and cleans up attachments first", async () => {
    const { service, tx, attachments } = makeFakes();
    const result = await service.remove({ id: "user-admin", name: "Admin Ann" }, "req-1", admin);
    expect(result).toEqual({ success: true });
    expect(attachments.deleteObjectsForRequest).toHaveBeenCalledWith("req-1");
    expect(tx.serviceRequest.delete).toHaveBeenCalledWith({ where: { id: "req-1" } });
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
