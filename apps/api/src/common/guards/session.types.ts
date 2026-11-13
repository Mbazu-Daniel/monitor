import type { NodeRequest as Request } from "@nestjs/platform-node";
import type { OrgRole } from "../auth/access-control.ts";

export type SessionUser = { id: string; email: string; name: string; activeOrganizationId: string | null };
export type TenantContext = { organizationId: string | null; role: OrgRole | null; memberId: string | null };

export type AuthedRequest = Request & {
  user?: SessionUser | null;
  tenant?: TenantContext;
};
