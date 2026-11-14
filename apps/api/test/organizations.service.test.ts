import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "../src/generated/prisma/client.ts";
import { OrganizationsService } from "../src/organizations/organizations.service.ts";
import { AuditSink } from "../src/common/audit/audit.ts";

function makeFakes() {
  const current = { id: "org-1", name: "MIVA Open University", slug: "miva-open-university", code: "MOU" };
  const db = {
    organization: {
      findUnique: vi.fn(async (args: { where: { id?: string; code?: string } }) => {
        if (args.where.id === "org-1") return { ...current };
        if (args.where.code === "TAKEN") return { id: "org-2" };
        return null;
      }),
      update: vi.fn(async (args: { data: { code: string } }) => ({ ...current, code: args.data.code })),
    },
  };
  const auditSink = { platform: vi.fn(async () => {}), inTx: vi.fn(async () => {}) };
  const service = new OrganizationsService(db as unknown as PrismaClient, auditSink as unknown as AuditSink);
  return { service, db, auditSink };
}

describe("updateCode", () => {
  it("updates the campus code and audits the change", async () => {
    const { service, db, auditSink } = makeFakes();
    const result = await service.updateCode("org-1", "user-1", "EBSU", "member-1");
    expect(result.organization.code).toBe("EBSU");
    expect(db.organization.update).toHaveBeenCalledWith({
      where: { id: "org-1" },
      data: { code: "EBSU" },
      select: { id: true, name: true, slug: true, code: true },
    });
    expect(auditSink.platform).toHaveBeenCalledWith(
      expect.objectContaining({ action: "ORGANIZATION_UPDATED", entityId: "org-1", organizationId: "org-1", details: 'Campus code changed from "MOU" to "EBSU"' }),
    );
  });

  it("is a no-op when the code is unchanged", async () => {
    const { service, db, auditSink } = makeFakes();
    const result = await service.updateCode("org-1", "user-1", "MOU", "member-1");
    expect(result.organization.code).toBe("MOU");
    expect(db.organization.update).not.toHaveBeenCalled();
    expect(auditSink.platform).not.toHaveBeenCalled();
  });

  it("rejects a code already used by another campus", async () => {
    const { service, db } = makeFakes();
    await expect(service.updateCode("org-1", "user-1", "TAKEN", "member-1")).rejects.toThrow("That campus code is already taken");
    expect(db.organization.update).not.toHaveBeenCalled();
  });

  it("rejects when the user does not belong to a campus", async () => {
    const { service } = makeFakes();
    await expect(service.updateCode(null, "user-1", "EBSU", null)).rejects.toThrow("You do not belong to a campus");
  });
});
