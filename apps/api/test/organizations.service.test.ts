import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "../src/generated/prisma/client.ts";
import { OrganizationsService } from "../src/organizations/organizations.service.ts";
import { AuditSink } from "../src/common/audit/audit.ts";

const { createOrganization } = vi.hoisted(() => ({
  createOrganization: vi.fn(async () => ({ id: "org-new", name: "Lagos Polytechnic", slug: "lagos-poly", code: "LPOLY" })),
}));

vi.mock("../src/common/config/better-auth.config.ts", () => ({
  auth: { api: { createOrganization } },
}));

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

describe("listMine", () => {
  it("returns only the campuses the requesting user belongs to", async () => {
    const findMany = vi.fn(async () => [
      { role: "ADMIN", organization: { id: "org-1", name: "MIVA Open University", slug: "miva-open-university", code: "MOU" } },
      { role: "STAFF", organization: { id: "org-2", name: "Lagos Polytechnic", slug: "lagos-poly", code: "LPOLY" } },
    ]);
    const db = { member: { findMany } };
    const auditSink = { platform: vi.fn(async () => {}), inTx: vi.fn(async () => {}) };
    const service = new OrganizationsService(db as unknown as PrismaClient, auditSink as unknown as AuditSink);

    const result = await service.listMine("user-1");

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "user-1" } }));
    expect(result.organizations).toEqual([
      { id: "org-1", name: "MIVA Open University", slug: "miva-open-university", code: "MOU", role: "ADMIN" },
      { id: "org-2", name: "Lagos Polytechnic", slug: "lagos-poly", code: "LPOLY", role: "STAFF" },
    ]);
  });
});

describe("create", () => {
  function makeCreateFakes() {
    const db = {
      organization: {
        findUnique: vi.fn(async () => null),
      },
      member: {
        findFirst: vi.fn(async (_args?: { where?: Record<string, unknown> }) => ({ id: "member-new" })),
        update: vi.fn(async () => ({})),
      },
      category: {
        findFirst: vi.fn(async () => ({ id: "cat-1", name: "Electrical Fault" })),
        create: vi.fn(async () => ({ id: "cat-1" })),
      },
    };
    const auditSink = { platform: vi.fn(async () => {}), inTx: vi.fn(async () => {}) };
    const service = new OrganizationsService(db as unknown as PrismaClient, auditSink as unknown as AuditSink);
    return { service, db, auditSink };
  }

  const dto = {
    name: "Lagos Polytechnic",
    slug: "lagos-poly",
    code: "LPOLY",
    adminName: "Ada Obi",
    department: "",
    categories: [{ name: "Electrical Fault", description: "Power outages", icon: "Zap" }],
  };

  it("creates a campus for a user who already belongs to one", async () => {
    const { service, db } = makeCreateFakes();
    const result = await service.create("user-1", dto, "session-cookie");

    expect(createOrganization).toHaveBeenCalledWith(
      expect.objectContaining({ body: { name: "Lagos Polytechnic", slug: "lagos-poly", code: "LPOLY" } }),
    );
    expect(result.id).toBe("org-new");
    const membershipPreChecks = db.member.findFirst.mock.calls.filter(([args]) => args?.where?.userId && !args.where.organizationId);
    expect(membershipPreChecks).toHaveLength(0);
  });

  it("records the administrator name on the new membership", async () => {
    const { service, db } = makeCreateFakes();
    await service.create("user-1", dto);

    expect(db.member.update).toHaveBeenCalledWith({
      where: { organizationId_userId: { organizationId: "org-new", userId: "user-1" } },
      data: { name: "Ada Obi" },
    });
  });
});

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
