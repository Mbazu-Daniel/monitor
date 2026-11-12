import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "../src/generated/prisma/client.ts";
import { RequestsService } from "../src/requests/requests.service.ts";

const staff = { organizationId: "org-1", role: "STAFF" as const, memberId: "member-staff" };
const officer = { organizationId: "org-1", role: "OFFICER" as const, memberId: "member-officer" };
const admin = { organizationId: "org-1", role: "ADMIN" as const, memberId: "member-admin" };

function makeFakes() {
  const db = {
    serviceRequest: {
      count: vi.fn(async () => 0),
      findMany: vi.fn(async () => []),
    },
  };
  const attachments = {
    presign: vi.fn(async (rows: unknown[]) => rows),
    deleteObjectsForRequest: vi.fn(async () => undefined),
  };
  const service = new RequestsService(db as unknown as PrismaClient, attachments as never);
  return { service, db };
}

describe("listFor visibility rules", () => {
  it("scopes staff to their own requests", async () => {
    const { service, db } = makeFakes();
    await service.listFor({}, staff);
    expect(db.serviceRequest.count).toHaveBeenCalledWith({
      where: { AND: [{ organizationId: "org-1" }, { creatorId: "member-staff" }] },
    });
  });

  it("scopes officers to their active assignments", async () => {
    const { service, db } = makeFakes();
    await service.listFor({}, officer);
    expect(db.serviceRequest.count).toHaveBeenCalledWith({
      where: { AND: [{ organizationId: "org-1" }, { assignments: { some: { officerId: "member-officer", isActive: true } } }] },
    });
  });

  it("lets admins see the whole campus", async () => {
    const { service, db } = makeFakes();
    await service.listFor({}, admin);
    expect(db.serviceRequest.count).toHaveBeenCalledWith({
      where: { organizationId: "org-1" },
    });
  });

  it("applies the status and priority filters", async () => {
    const { service, db } = makeFakes();
    await service.listFor({ status: "OPEN", priority: "URGENT" }, admin);
    expect(db.serviceRequest.count).toHaveBeenCalledWith({
      where: { AND: [{ organizationId: "org-1" }, { status: "OPEN" }, { priority: "URGENT" }] },
    });
  });

  it("expands search into an OR across reference, title, description and location", async () => {
    const { service, db } = makeFakes();
    await service.listFor({ search: "leak" }, admin);
    expect(db.serviceRequest.count).toHaveBeenCalledWith({
      where: {
        AND: [
          { organizationId: "org-1" },
          {
            OR: [
              { reference: { contains: "leak", mode: "insensitive" } },
              { title: { contains: "leak", mode: "insensitive" } },
              { description: { contains: "leak", mode: "insensitive" } },
              { location: { contains: "leak", mode: "insensitive" } },
            ],
          },
        ],
      },
    });
  });
});
