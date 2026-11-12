import { describe, expect, it } from "vitest";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { TenantScope, scopedOrganizationId } from "../src/common/utils/tenant-scope.ts";

const tenant = { organizationId: "org-1", role: "OFFICER" as const, memberId: "member-1" };

describe("TenantScope", () => {
  it("passes the campus through for valid tenants", () => {
    const scope = TenantScope.of(tenant);
    expect(scope.where()).toEqual({ organizationId: "org-1" });
    expect(scope.some()).toEqual({ some: { organizationId: "org-1" } });
    expect(scope.organizationId).toBe("org-1");
    expect(scope.memberId).toBe("member-1");
    expect(scope.role).toBe("OFFICER");
  });

  it("fails closed when there is no tenant", () => {
    const scope = TenantScope.of(undefined);
    expect(scope.where().organizationId).not.toBe("");
    expect(scope.where().organizationId).toBe("__never__");
    expect(scope.memberIdOrNoMatch()).toBe("__none__");
    expect(scope.organizationId).toBeNull();
    expect(scope.memberId).toBeNull();
  });

  it("requireMemberId throws when absent and returns the id when present", () => {
    expect(() => TenantScope.of(undefined).requireMemberId()).toThrow(BadRequestException);
    expect(TenantScope.of(tenant).requireMemberId()).toBe("member-1");
  });

  it("requireOrganizationId throws when absent", () => {
    expect(() => TenantScope.of(undefined).requireOrganizationId()).toThrow(BadRequestException);
    expect(TenantScope.of(tenant).requireOrganizationId()).toBe("org-1");
  });

  it("assertEntity accepts matching rows and rejects mismatched ones as NotFound", () => {
    const scope = TenantScope.of(tenant);
    expect(() => scope.assertEntity("org-1")).not.toThrow();
    expect(() => scope.assertEntity("org-2")).toThrow(NotFoundException);
    expect(() => scope.assertEntity(null)).toThrow(NotFoundException);
    expect(() => TenantScope.of(undefined).assertEntity("org-1")).toThrow(NotFoundException);
  });
});

describe("scopedOrganizationId", () => {
  it("passes through real ids and masks null", () => {
    expect(scopedOrganizationId("org-1")).toBe("org-1");
    expect(scopedOrganizationId(null)).toBe("__never__");
  });
});
