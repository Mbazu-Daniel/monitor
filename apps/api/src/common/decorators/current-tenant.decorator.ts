import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { AuthedRequest } from "../guards/session.guard.ts";


export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest<AuthedRequest>().user,
);


export const CurrentTenant = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest<AuthedRequest>().tenant,
);
