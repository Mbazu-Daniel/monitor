import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { Prisma, PrismaClient } from "../generated/prisma/client.ts";
import { PRISMA } from "../common/constants/prisma-token.ts";
import { nextStaffNo } from "../common/utils/staff-no.ts";
import { hashPassword } from "../common/utils/password.ts";
import { createCredentialUser, revokeSessions } from "../common/utils/create-credential-user.ts";
import { AuditSink } from "../common/utils/audit.ts";
import { parsePagination } from "../common/utils/pagination.ts";
import { scopedOrganizationId } from "../common/utils/tenant-scope.ts";
import type { TenantContext } from "../common/guards/session.guard.ts";
import type { CreateUserDto, UpdateUserDto } from "./users.dto.ts";

@Injectable()
export class UsersService {
  constructor(@Inject(PRISMA) private readonly db: PrismaClient, private readonly auditSink: AuditSink) {}
  async list(query: Record<string, unknown>, organizationId: string | null, actorRole: string | null = null) {
    const { page, pageSize, skip, take } = parsePagination(query, 10);
    const search = typeof query.search === "string" ? query.search.trim() : undefined;
    const roleInput = typeof query.role === "string" ? query.role : undefined;
    const role = actorRole === "STAFF" ? "STUDENT" : roleInput;

    const and: Prisma.UserWhereInput[] = [
      { memberships: { some: { organizationId: scopedOrganizationId(organizationId) } } },
    ];
    if (search) {
      and.push({
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { department: { contains: search, mode: "insensitive" } },
          { matricNo: { contains: search, mode: "insensitive" } },
        ],
      });
    }
    if (role) and.push({ memberships: { some: { organizationId: scopedOrganizationId(organizationId), role } } });
    const where: Prisma.UserWhereInput = { AND: and };

    const [total, users] = await Promise.all([
      this.db.user.count({ where }),
      this.db.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          department: true,
          phone: true,
          matricNo: true,
          isActive: true,
          createdAt: true,
          memberships: { where: { organizationId: scopedOrganizationId(organizationId) }, select: { id: true, role: true }, take: 1 },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
    ]);

    const memberIds = users.flatMap((u) => u.memberships.map((m) => m.id));
    const [requestCounts, assignmentCounts] = memberIds.length
      ? await Promise.all([
          this.db.serviceRequest.groupBy({
            by: ["creatorId"],
            where: { creatorId: { in: memberIds }, organizationId: scopedOrganizationId(organizationId) },
            _count: { _all: true },
          }),
          this.db.assignment.groupBy({
            by: ["officerId"],
            where: { officerId: { in: memberIds }, isActive: true },
            _count: { _all: true },
          }),
        ])
      : [[], []];
    const requestsByMember = new Map(requestCounts.map((r) => [r.creatorId, r._count._all]));
    const assignmentsByMember = new Map(assignmentCounts.map((a) => [a.officerId, a._count._all]));

    const items = users.map(({ memberships, ...u }) => {
      const member = memberships[0];
      const memberId = member?.id;
      return {
        ...u,
        role: member?.role ?? null,
        _count: {
          requests: (memberId && requestsByMember.get(memberId)) || 0,
          assignments: (memberId && assignmentsByMember.get(memberId)) || 0,
        },
      };
    });
    return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
  }

  async create(dto: CreateUserDto, actor: { id: string; name: string }, tenant: TenantContext | undefined) {
    const organizationId = tenant?.organizationId ?? null;
    const actorRole = tenant?.role ?? null;
    if (actorRole === "STAFF") {
      if (!organizationId) throw new ForbiddenException("Staff can only add students inside a campus.");
      if (dto.role !== "STUDENT") throw new ForbiddenException("Staff can only create student accounts.");
    }
    const email = dto.email.trim().toLowerCase();
    const existing = await this.db.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException("A user with this email already exists.");

    const org = organizationId ? await this.db.organization.findUnique({ where: { id: organizationId }, select: { code: true } }) : null;

    const user = await createCredentialUser({
      name: dto.name,
      email,
      password: dto.password,
      department: dto.department || null,
      phone: dto.phone || null,
      matricNo: dto.matricNo || null,
    });

    let assignedMatricNo = user.matricNo;
    const auditEntry = { userId: actor.id, memberId: tenant?.memberId ?? null, action: "USER_CREATED" as const, entityType: "USER" as const, entityId: user.id, details: `${actor.name} created ${dto.role} account for ${user.email}`, organizationId };
    if (organizationId && org) {
      await this.db.$transaction(async (tx) => {
        if (!assignedMatricNo && (dto.role === "STAFF" || dto.role === "STUDENT")) {
          await tx.$executeRaw`SELECT 1 FROM "organization" WHERE "id" = ${organizationId} FOR UPDATE`;
          assignedMatricNo = dto.role === "STUDENT"
            ? await nextStaffNo(tx, organizationId, org.code, "STUDENT", "S")
            : await nextStaffNo(tx, organizationId, org.code, "STAFF");
          await tx.user.update({ where: { id: user.id }, data: { matricNo: assignedMatricNo } });
        }
        await tx.member.create({ data: { organizationId, userId: user.id, role: dto.role } });
        await this.auditSink.inTx(tx, auditEntry);
      });
    } else {
      await this.auditSink.platform(auditEntry);
    }

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

  async update(id: string, dto: UpdateUserDto, actor: { id: string; name: string }, tenant: TenantContext | undefined) {
    const organizationId = tenant?.organizationId ?? null;
    const target = await this.db.user.findUnique({
      where: { id },
      include: { memberships: { where: organizationId ? { organizationId } : undefined, select: { id: true, role: true } } },
    });
    if (!target) throw new NotFoundException("User not found.");
    if (organizationId && target.memberships.length === 0) throw new NotFoundException("User not found.");

    if (tenant?.role === "STAFF") {
      if (!target.memberships.every((m) => m.role === "STUDENT")) {
        throw new ForbiddenException("Staff can only manage student accounts.");
      }
      if (dto.role && dto.role !== "STUDENT") {
        throw new ForbiddenException("Staff cannot change roles.");
      }
    }

    if (id === actor.id) {
      if (dto.role && dto.role !== "ADMIN") throw new ForbiddenException("You cannot change your own role.");
      if (dto.isActive === false) throw new ForbiddenException("You cannot deactivate your own account.");
    }

    if (organizationId && target.memberships.some((m) => m.role === "ADMIN") && dto.role && dto.role !== "ADMIN") {
      const admins = await this.db.member.count({ where: { organizationId, role: "ADMIN" } });
      if (admins <= 1) throw new ConflictException("Cannot demote the only active administrator.");
    }

    const data: Prisma.UserUpdateInput = {
      ...(dto.name ? { name: dto.name } : {}),
      ...(dto.department !== undefined ? { department: dto.department || null } : {}),
      ...(dto.phone !== undefined ? { phone: dto.phone || null } : {}),
      ...(dto.matricNo !== undefined ? { matricNo: dto.matricNo || null } : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
    };

    const updated = await this.db.user.update({ where: { id }, data });

    if (dto.role) {
      if (organizationId) {
        await this.db.member.updateMany({ where: { userId: id, organizationId }, data: { role: dto.role } });
      }
    }

    if (dto.password) {
      await this.db.account.updateMany({
        where: { userId: id, providerId: "credential" },
        data: { password: await hashPassword(dto.password) },
      });
      await revokeSessions(id);
    }

    if (dto.isActive === false) {
      await revokeSessions(id);
    }

    const changes = Object.keys(dto).filter((k) => k !== "password").join(", ");
    await this.auditSink.platform({ userId: actor.id, memberId: tenant?.memberId ?? null, action: "USER_UPDATED", entityType: "USER", entityId: id, details: `${actor.name} updated ${target.name} (${changes || "profile"})${dto.password ? " + password reset" : ""}`, organizationId });

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
