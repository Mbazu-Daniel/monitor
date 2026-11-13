import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "../src/generated/prisma/client.ts";
import { ExportService } from "../src/export/export.service.ts";

const admin = { organizationId: "org-1", role: "ADMIN" as const, memberId: "member-admin" };

const row = {
  reference: "SR-1",
  title: 'Broken "socket", 2nd floor',
  category: { name: "Electrical Fault" },
  location: "Room 214",
  priority: "HIGH",
  status: "OPEN",
  creator: { user: { name: "Chinedu Okoro", department: "Physics" } },
  assignments: [{ officer: { user: { name: "Officer Ada" } } }],
  createdAt: new Date("2026-01-02T00:00:00.000Z"),
  updatedAt: new Date("2026-01-03T00:00:00.000Z"),
};

function makeFakes() {
  const db = {
    serviceRequest: {
      findMany: vi.fn(async () => [row]),
    },
  };
  const service = new ExportService(db as unknown as PrismaClient);
  return { service, db };
}

describe("requestsCsv", () => {
  it("renders a BOM-prefixed CSV with the header and quoted values", async () => {
    const { service } = makeFakes();
    const { csv, count } = await service.requestsCsv({}, admin);
    expect(count).toBe(1);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain("Reference,Title,Category,Location,Priority,Status,Submitted By,Department,Assigned Officer,Created,Last Updated");
    expect(csv).toContain('SR-1,"Broken ""socket"", 2nd floor"');
    expect(csv).toContain("Electrical Fault");
    expect(csv).toContain("Physics");
    expect(csv).toContain("Officer Ada");
  });

  it("restricts officers to their active assignments", async () => {
    const { service, db } = makeFakes();
    await service.requestsCsv({}, { organizationId: "org-1", role: "OFFICER" as const, memberId: "member-officer" });
    expect(db.serviceRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          assignments: { some: { officerId: "member-officer", isActive: true } },
        }),
      }),
    );
  });

  it("applies the status filter", async () => {
    const { service, db } = makeFakes();
    await service.requestsCsv({ status: "OPEN" }, admin);
    expect(db.serviceRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ AND: [{ status: "OPEN" }] }),
      }),
    );
  });
});
