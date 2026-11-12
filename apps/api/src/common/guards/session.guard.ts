import {
  Inject,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { NodeRequest as Request } from "@nestjs/platform-node";
import { auth } from "../config/better-auth.config.ts";
import type { PrismaClient } from "../../generated/prisma/client.ts";
import { PRISMA } from "../constants/prisma-token.ts";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator.ts";
import { PERMISSIONS_KEY, type RequiredPermissions } from "../decorators/permissions.decorator.ts";
import { orgRoles, type OrgRole } from "../utils/access-control.ts";

export type SessionUser = { id: string; email: string; name: string; activeOrganizationId: string | null };
export type TenantContext = { organizationId: string | null; role: OrgRole | null; memberId: string | null };

export type AuthedRequest = Request & {
  user?: SessionUser | null;
  tenant?: TenantContext;
};

export async function readSession(req: { headers: { cookie?: string } }): Promise<SessionUser | null> {
  const headers = new Headers();
  if (req.headers.cookie) headers.set("cookie", req.headers.cookie);
  const session = await auth.api.getSession({ headers });
  if (!session?.user) return null;
  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    activeOrganizationId: (session.session as { activeOrganizationId?: string | null } | undefined)?.activeOrganizationId ?? null,
  };
}

async function lookupTenant(req: AuthedRequest, db: PrismaClient) {
  const session = await readSession(req);
  if (!session) return null;
  const dbUser = await db.user.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      email: true,
      name: true,
      isActive: true,
      memberships: { select: { id: true, organizationId: true, role: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!dbUser || dbUser.isActive === false) return null;
  const memberships = dbUser.memberships;
  const preferred = session.activeOrganizationId
    ? memberships.find((m) => m.organizationId === session.activeOrganizationId)
    : undefined;
  const membership = preferred ?? memberships[0] ?? null;
  return { ...dbUser, membership, activeOrganizationId: session.activeOrganizationId };
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, @Inject(PRISMA) private readonly db: PrismaClient) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [ctx.getHandler(), ctx.getClass()])) {
      return true;
    }
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    const dbUser = await lookupTenant(req, this.db);
    if (!dbUser) throw new UnauthorizedException("You must be signed in to do that.");
    req.user = { id: dbUser.id, email: dbUser.email, name: dbUser.name, activeOrganizationId: dbUser.activeOrganizationId };
    req.tenant = {
      organizationId: dbUser.membership?.organizationId ?? null,
      role: (dbUser.membership?.role as OrgRole | undefined) ?? null,
      memberId: dbUser.membership?.id ?? null,
    };
    return true;
  }
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<RequiredPermissions | undefined>(PERMISSIONS_KEY, [ctx.getHandler(), ctx.getClass()]);
    if (!required || Object.keys(required).length === 0) return true;
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    const role = req.tenant?.role;
    const resolved = role ? orgRoles[role] : undefined;
    if (!resolved) {
      throw new ForbiddenException("You are not allowed to do that.");
    }
    const authorized = resolved.authorize(required);
    if (!authorized.success) {
      throw new ForbiddenException("You are not allowed to do that.");
    }
    return true;
  }
}
