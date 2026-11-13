import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PERMISSIONS_KEY, type RequiredPermissions } from "../decorators/permissions.decorator.ts";
import { orgRoles } from "../auth/access-control.ts";
import type { AuthedRequest } from "./session.types.ts";

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
