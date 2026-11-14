import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { auth } from "../common/config/better-auth.config.ts";
import { PRISMA } from "../common/constants/prisma-token.ts";
import type { PrismaClient } from "../generated/prisma/client.ts";
import { AuditSink } from "../common/audit/audit.ts";
import { nextStaffNo } from "../common/tenancy/staff-no.ts";
import { slugify, uniqueSlug } from "../common/tenancy/slug.ts";
import { uniqueCampusCode } from "../common/tenancy/campus-code.ts";
import { isUniqueViolation } from "../common/db-errors.ts";
import type { CreateOrganizationDto, JoinOrganizationDto } from "./organizations.dto.ts";

function betterAuthErrorCode(error: unknown): string | null {
  const code = (error as { body?: { code?: unknown } | undefined } | null | undefined)?.body?.code;
  return typeof code === "string" ? code : null;
}

@Injectable()
export class OrganizationsService {
  constructor(@Inject(PRISMA) private readonly db: PrismaClient, private readonly auditSink: AuditSink) {}
  async listMine(userId: string) {
    const memberships = await this.db.member.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: { role: true, organization: { select: { id: true, name: true, slug: true, code: true } } },
    });
    return {
      organizations: memberships.map((membership) => ({
        ...membership.organization,
        role: membership.role,
      })),
    };
  }

  async resolve(code: string) {
    const organization = await this.db.organization.findUnique({
      where: { code: code.toUpperCase() },
      select: { name: true, slug: true, code: true },
    });
    if (!organization) {
      throw new NotFoundException("We couldn't find a campus with that code. Ask your campus administrator for the right one.");
    }
    return { organization };
  }

  
  private async assertSlugAvailable(slug: string | undefined) {
    if (!slug) return;
    const taken = await this.db.organization.findUnique({ where: { slug }, select: { id: true } });
    if (taken) throw new ConflictException("That subdomain is already taken. Try another.");
  }

  private async assertCodeAvailable(code: string | undefined) {
    if (!code) return;
    const taken = await this.db.organization.findUnique({ where: { code }, select: { id: true } });
    if (taken) throw new ConflictException("That campus code is already taken. Try another.");
  }

  private async resolveSlugAndCode(dto: CreateOrganizationDto) {
    const slug = dto.slug ?? (await uniqueSlug(slugify(dto.name)));
    await this.assertSlugAvailable(dto.slug);
    const code = dto.code ?? (await uniqueCampusCode(dto.name));
    await this.assertCodeAvailable(dto.code);
    return { slug, code };
  }

  private async creatorMemberId(organizationId: string, userId: string): Promise<string | null> {
    const member = await this.db.member.findFirst({ where: { organizationId, userId }, select: { id: true } });
    return member?.id ?? null;
  }

  private async applyDepartment(userId: string, department: string | undefined) {
    if (!department) return;
    await this.db.user.update({ where: { id: userId }, data: { department } });
  }

  private async provisionCategories(organizationId: string, categories: CreateOrganizationDto["categories"]) {
    const provisioned = [];
    for (const category of categories) {
      const reusable = await this.db.category.findFirst({ where: { name: category.name, OR: [{ organizationId: null }, { organizationId }] } });
      if (reusable) {
        provisioned.push(reusable);
        continue;
      }
      try {
        provisioned.push(
          await this.db.category.create({
            data: {
              name: category.name,
              description: category.description || null,
              icon: category.icon || "Wrench",
              organizationId,
            },
          }),
        );
      } catch (error) {
        if (!isUniqueViolation(error)) throw error;
        const winner = await this.db.category.findFirst({ where: { name: category.name, OR: [{ organizationId: null }, { organizationId }] } });
        if (winner) {
          provisioned.push(winner);
          continue;
        }
        throw error;
      }
    }
    return provisioned;
  }

  async create(userId: string, dto: CreateOrganizationDto, cookie?: string) {
    const { slug, code } = await this.resolveSlugAndCode(dto);
    const headers = new Headers();
    if (cookie) headers.set("cookie", cookie);

    await this.applyDepartment(userId, dto.department);

    let organization;
    try {
      organization = await auth.api.createOrganization({
        body: { name: dto.name, slug, code },
        headers,
      });
    } catch (error) {
      const errorCode = betterAuthErrorCode(error);
      if (errorCode === "ORGANIZATION_ALREADY_EXISTS" || errorCode === "ORGANIZATION_SLUG_ALREADY_TAKEN") {
        throw new ConflictException("That subdomain is already taken. Try another.");
      }
      if (errorCode === "YOU_HAVE_REACHED_THE_MAXIMUM_NUMBER_OF_ORGANIZATIONS") {
        throw new ConflictException("You already belong to the maximum number of campuses.");
      }
      if (errorCode === "YOU_ARE_NOT_ALLOWED_TO_CREATE_A_NEW_ORGANIZATION") {
        throw new ConflictException("You are not allowed to create a campus.");
      }
      if (isUniqueViolation(error)) throw new ConflictException("That subdomain or campus code was just taken. Try another.");
      throw error;
    }
    if (!organization?.id) {
      throw new ConflictException("Unable to create the campus right now. Please try again.");
    }

    if (dto.adminName?.trim()) {
      await this.db.member.update({
        where: { organizationId_userId: { organizationId: organization.id, userId } },
        data: { name: dto.adminName.trim() },
      });
    }

    const categories = await this.provisionCategories(organization.id, dto.categories);

    const creatorMemberId = await this.creatorMemberId(organization.id, userId);
    await this.auditSink.platform({ userId, memberId: creatorMemberId, action: "ORGANIZATION_CREATED", entityType: "ORGANIZATION", entityId: organization.id, details: `Campus "${organization.name}" created with ${categories.length} starter categories`, organizationId: organization.id });

    return organization;
  }

  
  async updateCode(organizationId: string | null, userId: string, code: string, memberId: string | null) {
    if (!organizationId) throw new NotFoundException("You do not belong to a campus.");
    const organization = await this.db.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true, slug: true, code: true },
    });
    if (!organization) throw new NotFoundException("Campus not found.");
    if (organization.code === code) return { organization };

    await this.assertCodeAvailable(code);

    let updated;
    try {
      updated = await this.db.organization.update({
        where: { id: organizationId },
        data: { code },
        select: { id: true, name: true, slug: true, code: true },
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictException("That campus code is already taken. Try another.");
      throw error;
    }

    await this.auditSink.platform({
      userId,
      memberId,
      action: "ORGANIZATION_UPDATED",
      entityType: "ORGANIZATION",
      entityId: organizationId,
      details: `Campus code changed from "${organization.code}" to "${code}"`,
      organizationId,
    });

    return { organization: updated };
  }

  
  async join(userId: string, dto: JoinOrganizationDto) {
    const organization = await this.db.organization.findUnique({ where: { code: dto.campusCode }, select: { id: true, name: true, slug: true, code: true } });
    if (!organization) {
      throw new NotFoundException("We couldn't find a campus with that code. Ask your campus administrator for the right one.");
    }

    const existing = await this.db.member.findUnique({ where: { organizationId_userId: { organizationId: organization.id, userId } } });
    if (existing) {
      const me = await this.db.user.findUnique({ where: { id: userId }, select: { matricNo: true } });
      return { organization, alreadyMember: true, staffNo: me?.matricNo ?? null };
    }

    try {
      const { next: staffNo } = await this.db.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT 1 FROM "organization" WHERE "id" = ${organization.id} FOR UPDATE`;
        const next = await nextStaffNo(tx, organization.id, organization.code);
        await tx.user.update({
          where: { id: userId },
          data: {
            department: dto.department || null,
            phone: dto.phone || null,
            matricNo: next,
          },
        });
        const member = await tx.member.create({
          data: { organizationId: organization.id, userId, role: "STAFF" },
        });
        await this.auditSink.inTx(tx, { userId, memberId: member.id, action: "USER_REGISTERED", entityType: "USER", entityId: userId, details: `STAFF joined ${organization.name} as ${next}`, organizationId: organization.id });
        return { next, memberId: member.id };
      });

      return { organization, alreadyMember: false, staffNo };
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      const me = await this.db.user.findUnique({ where: { id: userId }, select: { matricNo: true } });
      return { organization, alreadyMember: true, staffNo: me?.matricNo ?? null };
    }
  }
}
