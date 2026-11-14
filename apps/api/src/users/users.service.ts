import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { Prisma, PrismaClient } from "../generated/prisma/client.ts";
import { PRISMA } from "../common/constants/prisma-token.ts";
import { nextStaffNo } from "../common/tenancy/staff-no.ts";
import { hashPassword } from "../common/auth/password.ts";
import { createCredentialUser, revokeSessions } from "../common/auth/create-credential-user.ts";
import { isUniqueViolation } from "../common/db-errors.ts";
import { AuditSink } from "../common/audit/audit.ts";
import type { TenantContext } from "../common/guards/session.types.ts";
import type { CreateUserDto, UpdateUserDto } from "./users.dto.ts";

function assertStaffCanManageTarget(dto: UpdateUserDto, target: { memberships: { role: string }[] }) {
  if (!target.memberships.every((m) => m.role === "STUDENT")) {
    throw new ForbiddenException("Staff can only manage student accounts.");
  }
  if (dto.role && dto.role !== "STUDENT") {
    throw new ForbiddenException("Staff cannot change roles.");
  }
}

function assertSelfRules(id: string, actorId: string, dto: UpdateUserDto) {
  if (id !== actorId) return;
  if (dto.role && dto.role !== "ADMIN") throw new ForbiddenException("You cannot change your own role.");
  if (dto.isActive === false) throw new ForbiddenException("You cannot deactivate your own account.");
}

function buildUserUpdateData(dto: UpdateUserDto): Prisma.UserUpdateInput {
  const data: Prisma.UserUpdateInput = {};
  if (dto.name) data.name = dto.name;
  if (dto.department !== undefined) data.department = dto.department || null;
  if (dto.phone !== undefined) data.phone = dto.phone || null;
  if (dto.matricNo !== undefined) data.matricNo = dto.matricNo || null;
  if (dto.isActive !== undefined) data.isActive = dto.isActive;
  return data;
}

@Injectable()
export class UsersService {
  constructor(@Inject(PRISMA) private readonly db: PrismaClient, private readonly auditSink: AuditSink) {}

  private assertCreateAllowed(dto: CreateUserDto, tenant: TenantContext | undefined): string | null {
    const organizationId = tenant?.organizationId ?? null;
    const actorRole = tenant?.role ?? null;
    if (actorRole === "STAFF") {
      if (!organizationId) throw new ForbiddenException("Staff can only add students inside a campus.");
      if (dto.role !== "STUDENT") throw new ForbiddenException("Staff can only create student accounts.");
    }
    return organizationId;
  }

  private async maybeAssignMatricNo(
    tx: Prisma.TransactionClient,
    organizationId: string,
    orgCode: string,
    dto: CreateUserDto,
    userId: string,
    current: string | null,
  ): Promise<string | null> {
    if (current) return current;
    if (dto.role !== "STAFF" && dto.role !== "STUDENT") return current;
    await tx.$executeRaw`SELECT 1 FROM "organization" WHERE "id" = ${organizationId} FOR UPDATE`;
    const assigned = dto.role === "STUDENT"
      ? await nextStaffNo(tx, organizationId, orgCode, "STUDENT", "S")
      : await nextStaffNo(tx, organizationId, orgCode, "STAFF");
    await tx.user.update({ where: { id: userId }, data: { matricNo: assigned } });
    return assigned;
  }

  async create(dto: CreateUserDto, actor: { id: string; name: string }, tenant: TenantContext | undefined) {
    const organizationId = this.assertCreateAllowed(dto, tenant);
    const email = dto.email.trim().toLowerCase();
    const existing = await this.db.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException("A user with this email already exists.");

    const org = organizationId ? await this.db.organization.findUnique({ where: { id: organizationId }, select: { code: true } }) : null;

    let assignedMatricNo: string | null = dto.matricNo || null;
    const user = await this.db.$transaction(async (tx) => {
      let created;
      try {
        created = await createCredentialUser({
          name: dto.name,
          email,
          password: dto.password,
          department: dto.department || null,
          phone: dto.phone || null,
          matricNo: dto.matricNo || null,
        }, tx);
      } catch (error) {
        if (isUniqueViolation(error)) throw new ConflictException("A user with this email already exists.");
        throw error;
      }
      const auditEntry = { userId: actor.id, memberId: tenant?.memberId ?? null, action: "USER_CREATED" as const, entityType: "USER" as const, entityId: created.id, details: `${actor.name} created ${dto.role} account for ${created.email}`, organizationId };
      if (organizationId && org) {
        assignedMatricNo = await this.maybeAssignMatricNo(tx, organizationId, org.code, dto, created.id, assignedMatricNo);
        await tx.member.create({ data: { organizationId, userId: created.id, role: dto.role } });
      }
      await this.auditSink.inTx(tx, auditEntry);
      return created;
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: organizationId ? dto.role : null,
        department: user.department,
        phone: user.phone,
        matricNo: assignedMatricNo,
        isActive: user.isActive,
        createdAt: user.createdAt,
      },
    };
  }

  private async loadTargetForUpdate(id: string, organizationId: string | null) {
    const target = await this.db.user.findUnique({
      where: { id },
      include: { memberships: { where: organizationId ? { organizationId } : undefined, select: { id: true, role: true } } },
    });
    if (!target) throw new NotFoundException("User not found.");
    if (organizationId && target.memberships.length === 0) throw new NotFoundException("User not found.");
    return target;
  }

  private assertManagementRules(actor: { id: string; name: string }, id: string, dto: UpdateUserDto, target: { memberships: { role: string }[] }, tenant: TenantContext | undefined) {
    if (tenant?.role === "STAFF") {
      assertStaffCanManageTarget(dto, target);
    }
    assertSelfRules(id, actor.id, dto);
  }

  private async assertNotDemotingLastAdmin(tx: Prisma.TransactionClient, organizationId: string, target: { memberships: { role: string }[] }, dto: UpdateUserDto) {
    if (!target.memberships.some((m) => m.role === "ADMIN")) return;
    if (!dto.role || dto.role === "ADMIN") return;
    await tx.$executeRaw`SELECT 1 FROM "organization" WHERE "id" = ${organizationId} FOR UPDATE`;
    const admins = await tx.member.count({ where: { organizationId, role: "ADMIN", user: { isActive: true } } });
    if (admins <= 1) throw new ConflictException("Cannot demote the only active administrator.");
  }

  async update(id: string, dto: UpdateUserDto, actor: { id: string; name: string }, tenant: TenantContext | undefined) {
    const organizationId = tenant?.organizationId ?? null;
    const target = await this.loadTargetForUpdate(id, organizationId);
    this.assertManagementRules(actor, id, dto, target, tenant);

    const passwordHash = dto.password ? await hashPassword(dto.password) : null;

    const updated = await this.db.$transaction(async (tx) => {
      if (organizationId) {
        await this.assertNotDemotingLastAdmin(tx, organizationId, target, dto);
      }
      const saved = await tx.user.update({ where: { id }, data: buildUserUpdateData(dto) });
      if (dto.role && organizationId) {
        await tx.member.updateMany({ where: { userId: id, organizationId }, data: { role: dto.role } });
      }
      if (passwordHash) {
        await tx.account.updateMany({
          where: { userId: id, providerId: "credential" },
          data: { password: passwordHash },
        });
      }
      const changes = Object.keys(dto).filter((k) => k !== "password").join(", ");
      await this.auditSink.inTx(tx, { userId: actor.id, memberId: tenant?.memberId ?? null, action: "USER_UPDATED", entityType: "USER", entityId: id, details: `${actor.name} updated ${target.name} (${changes || "profile"})${dto.password ? " + password reset" : ""}`, organizationId });
      return saved;
    });

    if (dto.password || dto.isActive === false) {
      await revokeSessions(id);
    }

    return {
      user: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        role: dto.role ?? target.memberships[0]?.role ?? null,
        department: updated.department,
        phone: updated.phone,
        matricNo: updated.matricNo,
        isActive: updated.isActive,
        createdAt: updated.createdAt,
      },
    };
  }
}
