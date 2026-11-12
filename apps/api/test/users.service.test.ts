import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConflictException, ForbiddenException } from "@nestjs/common";
import type { PrismaClient } from "../src/generated/prisma/client.ts";
import { UsersService } from "../src/users/users.service.ts";
import { AuditSink } from "../src/common/utils/audit.ts";
import type { CreateUserDto } from "../src/users/users.dto.ts";

const { createCredentialUser, revokeSessions } = vi.hoisted(() => ({
  createCredentialUser: vi.fn(),
  revokeSessions: vi.fn(),
}));

vi.mock("../src/common/utils/create-credential-user.ts", () => ({
  createCredentialUser,
  revokeSessions,
}));

vi.mock("../src/common/utils/password.ts", () => ({
  hashPassword: vi.fn(async () => "hashed-password"),
}));

const admin = { organizationId: "org-1", role: "ADMIN" as const, memberId: "member-admin" };
const staff = { organizationId: "org-1", role: "STAFF" as const, memberId: "member-staff" };
const actor = { id: "user-admin", name: "Admin Ann" };

const targetUser = {
  id: "user-1",
  name: "Ada Staff",
  email: "ada@miva.edu",
  department: "Registry",
  phone: null,
  matricNo: "MOU/0003",
  isActive: true,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
};

const createdUser = {
  id: "user-new",
  name: "New Person",
  email: "new@miva.edu",
  department: null,
  phone: null,
  matricNo: "MOU/0004",
  isActive: true,
  createdAt: new Date("2026-01-02T00:00:00.000Z"),
};

function makeFakes() {
  const tx = {
    member: { create: vi.fn(async () => ({})) },
    user: { update: vi.fn(async () => ({})) },
    auditLog: { create: vi.fn(async () => ({})) },
    $executeRaw: vi.fn(async () => 1),
  };
  const db = {
    user: {
      findUnique: vi.fn(async (): Promise<Record<string, unknown> | null> => ({ ...targetUser, memberships: [{ id: "member-1", role: "STAFF" }] })),
      update: vi.fn(async ({ data }: any) => ({ ...targetUser, ...data })),
    },
    member: {
      count: vi.fn(async () => 2),
      create: vi.fn(async () => ({})),
      updateMany: vi.fn(async () => ({ count: 1 })),
    },
    account: {
      updateMany: vi.fn(async () => ({ count: 1 })),
    },
    organization: {
      findUnique: vi.fn(async () => ({ code: "MOU" })),
    },
    $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(tx)),
  };
  const auditSink = { platform: vi.fn(async () => {}), inTx: vi.fn(async () => {}) };
  const service = new UsersService(db as unknown as PrismaClient, auditSink as unknown as AuditSink);
  return { service, db, tx, auditSink };
}

beforeEach(() => {
  vi.clearAllMocks();
  createCredentialUser.mockResolvedValue({ ...createdUser });
  revokeSessions.mockResolvedValue(undefined);
});

describe("update", () => {
  it("applies profile changes and audits them", async () => {
    const { service, db, auditSink } = makeFakes();
    const result = await service.update("user-1", { name: "Ada S", department: "Computer Science" }, actor, admin);
    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { name: "Ada S", department: "Computer Science" },
    });
    expect(auditSink.platform).toHaveBeenCalledWith(
      expect.objectContaining({ action: "USER_UPDATED", entityId: "user-1", organizationId: "org-1" }),
    );
    expect(result.user.name).toBe("Ada S");
  });

  it("forbids staff from granting non-student roles", async () => {
    const { service, db } = makeFakes();
    await expect(service.update("user-1", { role: "ADMIN" }, actor, staff)).rejects.toThrow(ForbiddenException);
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it("forbids users from demoting themselves", async () => {
    const { service, db } = makeFakes();
    db.user.findUnique.mockResolvedValueOnce({ ...targetUser, id: actor.id, memberships: [{ id: "member-admin", role: "ADMIN" }] });
    await expect(service.update(actor.id, { role: "STUDENT" }, actor, admin)).rejects.toThrow(ForbiddenException);
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it("refuses to demote the only administrator", async () => {
    const { service, db } = makeFakes();
    db.user.findUnique.mockResolvedValueOnce({ ...targetUser, memberships: [{ id: "member-admin", role: "ADMIN" }] });
    db.member.count.mockResolvedValueOnce(1);
    await expect(service.update("user-1", { role: "STAFF" }, actor, admin)).rejects.toThrow(ConflictException);
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it("hashes the new password and revokes sessions", async () => {
    const { service, db, auditSink } = makeFakes();
    await service.update("user-1", { password: "newsecret1" }, actor, admin);
    expect(db.account.updateMany).toHaveBeenCalledWith({
      where: { userId: "user-1", providerId: "credential" },
      data: { password: "hashed-password" },
    });
    expect(revokeSessions).toHaveBeenCalledWith("user-1");
    expect(auditSink.platform).toHaveBeenCalledWith(
      expect.objectContaining({ action: "USER_UPDATED", details: expect.stringContaining("password reset") }),
    );
  });

  it("revokes sessions when the account is deactivated", async () => {
    const { service } = makeFakes();
    await service.update("user-1", { isActive: false }, actor, admin);
    expect(revokeSessions).toHaveBeenCalledWith("user-1");
  });

  it("applies a role change to the campus membership", async () => {
    const { service, db } = makeFakes();
    db.user.findUnique.mockResolvedValueOnce({ ...targetUser, memberships: [{ id: "member-x", role: "STUDENT" }] });
    await service.update("user-1", { role: "STAFF" }, actor, admin);
    expect(db.member.updateMany).toHaveBeenCalledWith({
      where: { userId: "user-1", organizationId: "org-1" },
      data: { role: "STAFF" },
    });
  });
});

describe("create", () => {
  const dto: CreateUserDto = {
    name: "Grace Officer",
    email: "grace@miva.edu",
    password: "secret123",
    role: "OFFICER",
    department: "Electrical Unit",
    phone: "0803 000 0001",
    matricNo: "",
  };

  it("forbids staff from creating non-student accounts", async () => {
    const { service, db } = makeFakes();
    await expect(service.create(dto, actor, staff)).rejects.toThrow(ForbiddenException);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("rejects a duplicate email", async () => {
    const { service, db } = makeFakes();
    db.user.findUnique.mockResolvedValueOnce({ id: "existing" } as never);
    await expect(service.create(dto, actor, admin)).rejects.toThrow(ConflictException);
    expect(createCredentialUser).not.toHaveBeenCalled();
  });

  it("creates the member and audits in one transaction for campus admins", async () => {
    const { service, db, tx, auditSink } = makeFakes();
    db.user.findUnique.mockResolvedValueOnce(null);
    const result = await service.create({ ...dto, role: "STAFF" as never }, actor, admin);
    expect(db.$transaction).toHaveBeenCalled();
    expect(tx.member.create).toHaveBeenCalledWith({
      data: { organizationId: "org-1", userId: "user-new", role: "STAFF" },
    });
    expect(auditSink.inTx).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({ action: "USER_CREATED", entityType: "USER", entityId: "user-new" }),
    );
    expect(result.user.role).toBe("STAFF");
  });
});
