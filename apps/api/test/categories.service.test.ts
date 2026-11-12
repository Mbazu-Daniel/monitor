import { describe, expect, it, vi } from "vitest";
import { ConflictException, NotFoundException } from "@nestjs/common";
import type { PrismaClient } from "../src/generated/prisma/client.ts";
import { CategoriesService } from "../src/categories/categories.service.ts";
import { AuditSink } from "../src/common/utils/audit.ts";

const tenant = { organizationId: "org-1", role: "ADMIN" as const, memberId: "member-admin" };
const actor = { id: "user-1", name: "Admin Ann" };

function makeFakes() {
  const db = {
    category: {
      findUnique: vi.fn(async (): Promise<{ id: string; name: string; organizationId: string | null } | null> => ({ id: "cat-1", name: "Electrical", organizationId: null })),
      findFirst: vi.fn(async (): Promise<{ id: string; name: string; organizationId?: string | null } | null> => null),
      create: vi.fn(async ({ data }: any) => ({ id: "cat-new", ...data })),
      update: vi.fn(async ({ where, data }: any) => ({ id: where.id, name: data.name ?? "Electrical", ...data })),
      delete: vi.fn(async () => ({})),
    },
    serviceRequest: { count: vi.fn(async () => 0) },
  };
  const auditSink = { platform: vi.fn(async () => {}), inTx: vi.fn(async () => {}) };
  const service = new CategoriesService(db as unknown as PrismaClient, auditSink as unknown as AuditSink);
  return { service, db, auditSink };
}

describe("update", () => {
  it("applies the changes and audits the update", async () => {
    const { service, db, auditSink } = makeFakes();
    const result = await service.update("cat-1", { name: "Power" }, actor, tenant);
    expect(db.category.update).toHaveBeenCalledWith({
      where: { id: "cat-1" },
      data: expect.objectContaining({ name: "Power" }),
    });
    expect(auditSink.platform).toHaveBeenCalledWith(
      expect.objectContaining({ action: "CATEGORY_UPDATED", entityId: "cat-1" }),
    );
    expect(result.category.name).toBe("Power");
  });

  it("rejects a rename to an existing name", async () => {
    const { service, db } = makeFakes();
    db.category.findFirst.mockResolvedValueOnce({ id: "cat-other", name: "Power" });
    await expect(service.update("cat-1", { name: "Power" }, actor, tenant)).rejects.toThrow(ConflictException);
    expect(db.category.update).not.toHaveBeenCalled();
  });

  it("refuses to edit a category owned by another campus", async () => {
    const { service, db } = makeFakes();
    db.category.findUnique.mockResolvedValueOnce({ id: "cat-1", name: "Electrical", organizationId: "org-other" });
    await expect(service.update("cat-1", { name: "Power" }, actor, tenant)).rejects.toThrow(NotFoundException);
    expect(db.category.update).not.toHaveBeenCalled();
  });

  it("throws when the category does not exist", async () => {
    const { service, db } = makeFakes();
    db.category.findUnique.mockResolvedValueOnce(null);
    await expect(service.update("cat-1", { name: "Power" }, actor, tenant)).rejects.toThrow(NotFoundException);
  });
});
