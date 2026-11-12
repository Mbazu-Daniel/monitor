import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "../src/generated/prisma/client.ts";
import { MeService } from "../src/me/me.service.ts";
import { AuditSink } from "../src/common/utils/audit.ts";

const tenant = { organizationId: "org-1", role: "ADMIN" as const, memberId: "member-1" };
const user = {
  id: "user-1",
  name: "Ada Staff",
  email: "ada@miva.edu",
  department: "Registry",
  phone: null,
  matricNo: "MOU/0003",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
};

function makeFakes() {
  const db = {
    user: {
      findUnique: vi.fn(async () => ({ ...user })),
      update: vi.fn(async () => ({ ...user })),
    },
    member: {
      findUnique: vi.fn(async () => ({ id: "member-1", role: "ADMIN", organizationId: "org-1", userId: "user-1" })),
    },
    organization: {
      findUnique: vi.fn(async () => ({ name: "MIVA Open University", slug: "miva-open-university", code: "MOU" })),
    },
  };
  const auditSink = { platform: vi.fn(async () => {}), inTx: vi.fn(async () => {}) };
  const service = new MeService(db as unknown as PrismaClient, auditSink as unknown as AuditSink);
  return { service, db, auditSink };
}

describe("getMe", () => {
  it("merges the membership role and campus details", async () => {
    const { service } = makeFakes();
    const result = await service.getMe("user-1", "org-1");
    expect(result.user.role).toBe("ADMIN");
    expect(result.user.organizationName).toBe("MIVA Open University");
    expect(result.user.organizationSlug).toBe("miva-open-university");
    expect(result.user.organizationCode).toBe("MOU");
    expect(result.user.organizationId).toBe("org-1");
  });

  it("returns a null role and campus outside a campus", async () => {
    const { service, db } = makeFakes();
    const result = await service.getMe("user-1", null);
    expect(result.user.role).toBeNull();
    expect(result.user.organizationName).toBeNull();
    expect(result.user.organizationSlug).toBeNull();
    expect(result.user.organizationCode).toBeNull();
    expect(result.user.organizationId).toBeNull();
    expect(db.member.findUnique).not.toHaveBeenCalled();
  });
});

describe("updateProfile", () => {
  it("writes the profile fields and audits the change", async () => {
    const { service, db, auditSink } = makeFakes();
    await service.updateProfile("user-1", { name: "Ada S", phone: "0803 999 1234" }, tenant);
    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { name: "Ada S", phone: "0803 999 1234" },
    });
    expect(auditSink.platform).toHaveBeenCalledWith(
      expect.objectContaining({ action: "PROFILE_UPDATED", entityId: "user-1", organizationId: "org-1" }),
    );
  });

  it("maps empty strings back to null", async () => {
    const { service, db } = makeFakes();
    await service.updateProfile("user-1", { department: "", phone: "" }, tenant);
    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { department: null, phone: null },
    });
  });
});
