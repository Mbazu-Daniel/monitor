import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { auth } from "../common/config/better-auth.config.ts";
import { PRISMA } from "../common/constants/prisma-token.ts";
import type { PrismaClient } from "../generated/prisma/client.ts";
import { AuditSink } from "../common/utils/audit.ts";
import { nextStaffNo } from "../common/utils/staff-no.ts";
import { slugify, uniqueSlug } from "../common/utils/slug.ts";
import type { CreateOrganizationDto, JoinOrganizationDto } from "./organizations.dto.ts";

@Injectable()
export class OrganizationsService {
  constructor(@Inject(PRISMA) private readonly db: PrismaClient, private readonly auditSink: AuditSink) {}
  async listMine(userId: string) {
    const memberships = await this.db.member.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: { role: true, organization: { select: { id: true, name: true, slug: true } } },
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
      where: { slug: code },
      select: { name: true, slug: true },
    });
    if (!organization) {
      throw new NotFoundException("We couldn't find a campus with that code. Ask your campus administrator for the right one.");
    }
    return { organization };
  }

  
  async create(userId: string, dto: CreateOrganizationDto, cookieHeaders: Record<string, string>) {
    const existing = await this.db.member.findFirst({ where: { userId }, select: { id: true } });
    if (existing) {
      throw new ConflictException("You already belong to a campus.");
    }

    const slug = await uniqueSlug(slugify(dto.name));

    const headers = new Headers();
    if (cookieHeaders["cookie"]) headers.set("cookie", cookieHeaders["cookie"]);

    if (dto.department) {
      await this.db.user.update({ where: { id: userId }, data: { department: dto.department } });
    }

    const organization = await auth.api.createOrganization({
      body: { name: dto.name, slug },
      headers,
    });
    if (!organization?.id) {
      throw new ConflictException("Unable to create the campus right now. Please try again.");
    }

    
    const categories = [];
    for (const category of dto.categories) {
      const reusable = await this.db.category.findFirst({ where: { name: category.name, OR: [{ organizationId: null }, { organizationId: organization.id }] } });
      if (reusable) {
        categories.push(reusable);
        continue;
      }
      categories.push(
        await this.db.category.create({
          data: {
            name: category.name,
            description: category.description || null,
            icon: category.icon || "Wrench",
            organizationId: organization.id,
          },
        }),
      );
    }

    const creatorMember = await this.db.member.findFirst({ where: { organizationId: organization.id, userId }, select: { id: true } });
    await this.auditSink.platform({ userId, memberId: creatorMember?.id ?? null, action: "ORGANIZATION_CREATED", entityType: "ORGANIZATION", entityId: organization.id, details: `Campus "${organization.name}" created with ${categories.length} starter categories`, organizationId: organization.id });

    return organization;
  }

  
  async join(userId: string, dto: JoinOrganizationDto) {
    const organization = await this.db.organization.findUnique({ where: { slug: dto.campusCode }, select: { id: true, name: true, slug: true } });
    if (!organization) {
      throw new NotFoundException("We couldn't find a campus with that code. Ask your campus administrator for the right one.");
    }

    const existing = await this.db.member.findUnique({ where: { organizationId_userId: { organizationId: organization.id, userId } } });
    if (existing) {
      const me = await this.db.user.findUnique({ where: { id: userId }, select: { matricNo: true } });
      return { organization, alreadyMember: true, staffNo: me?.matricNo ?? null };
    }

    const { next: staffNo } = await this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT 1 FROM "organization" WHERE "id" = ${organization.id} FOR UPDATE`;
      const next = await nextStaffNo(tx, organization.id, organization.slug);
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
  }
}
