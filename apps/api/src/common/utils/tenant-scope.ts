import { BadRequestException, NotFoundException } from "@nestjs/common";
import type { TenantContext } from "../guards/session.guard.ts";

const NO_ORGANIZATION = "__never__";
const NO_MEMBER = "__none__";

export function scopedOrganizationId(organizationId: string | null): string {
  return organizationId ?? NO_ORGANIZATION;
}

export class TenantScope {
  private constructor(private readonly tenant: TenantContext | undefined) {}

  static of(tenant: TenantContext | undefined): TenantScope {
    return new TenantScope(tenant);
  }

  get role(): TenantContext["role"] {
    return this.tenant?.role ?? null;
  }

  get organizationId(): string | null {
    return this.tenant?.organizationId ?? null;
  }

  get memberId(): string | null {
    return this.tenant?.memberId ?? null;
  }

  where(): { organizationId: string } {
    return { organizationId: scopedOrganizationId(this.tenant?.organizationId ?? null) };
  }

  some(): { some: { organizationId: string } } {
    return { some: this.where() };
  }

  memberIdOrNoMatch(): string {
    return this.tenant?.memberId ?? NO_MEMBER;
  }

  requireMemberId(message = "You must be in a campus to do that."): string {
    const memberId = this.tenant?.memberId;
    if (!memberId) throw new BadRequestException(message);
    return memberId;
  }

  requireOrganizationId(message = "You must be in a campus to do that."): string {
    const organizationId = this.tenant?.organizationId;
    if (!organizationId) throw new BadRequestException(message);
    return organizationId;
  }

  assertEntity(entityOrganizationId: string | null | undefined, message = "Not found."): void {
    if (!this.tenant?.organizationId || entityOrganizationId !== this.tenant.organizationId) {
      throw new NotFoundException(message);
    }
  }
}
