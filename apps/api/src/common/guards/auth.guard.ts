import {
  Inject,
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { PrismaClient } from "../../generated/prisma/client.ts";
import { PRISMA } from "../constants/prisma-token.ts";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator.ts";
import type { OrgRole } from "../auth/access-control.ts";
import type { AuthedRequest } from "./session.types.ts";
import { lookupTenant } from "./session-resolution.ts";

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
