import { Inject, Injectable } from "@nestjs/common";
import { PRISMA } from "../common/constants/prisma-token.ts";
import type { PrismaClient } from "../generated/prisma/client.ts";
import type { TenantContext } from "../common/guards/session.types.ts";
import { AuditSink } from "../common/audit/audit.ts";

@Injectable()
export class MeService {
  constructor(@Inject(PRISMA) private readonly db: PrismaClient, private readonly auditSink: AuditSink) {}
  
  private async resolveCampus(userId: string, organizationId: string | null) {
    if (!organizationId) return [null, null] as const;
    return Promise.all([
      this.db.member.findUnique({ where: { organizationId_userId: { organizationId, userId } } }),
      this.db.organization.findUnique({ where: { id: organizationId }, select: { name: true, slug: true, code: true } }),
    ]);
  }

  async getMe(userId: string, organizationId: string | null) {
    const dbUser = await this.db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        department: true,
        phone: true,
        matricNo: true,
        createdAt: true,
      },
    });

    const [membership, organization] = await this.resolveCampus(userId, organizationId);

    return {
      user: {
        ...dbUser,
        name: membership?.name ?? dbUser?.name,
        role: membership?.role ?? null,
        organizationId,
        organizationName: organization?.name ?? null,
        organizationSlug: organization?.slug ?? null,
        organizationCode: organization?.code ?? null,
      },
    };
  }

  async updateProfile(
    userId: string,
    data: { name?: string; department?: string; phone?: string },
    tenant: TenantContext | undefined,
  ) {
    const organizationId = tenant?.organizationId ?? null;
    await this.db.user.update({
      where: { id: userId },
      data: {
        ...(data.name ? { name: data.name } : {}),
        ...(data.department !== undefined ? { department: data.department || null } : {}),
        ...(data.phone !== undefined ? { phone: data.phone || null } : {}),
      },
    });
    await this.auditSink.platform({ userId, memberId: tenant?.memberId ?? null, action: "PROFILE_UPDATED", entityType: "USER", entityId: userId, details: "Profile updated", organizationId });
    return this.getMe(userId, organizationId);
  }
}
