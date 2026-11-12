import { Controller, Get, Patch, Body, HttpCode } from "@nestjs/common";
import { CurrentUser, CurrentTenant } from "../common/decorators/current-tenant.decorator.ts";
import { MeService } from "./me.service.ts";
import type { TenantContext } from "../common/guards/session.guard.ts";
import { z } from "zod";

const UpdateProfileDto = z.object({ name: z.string().trim().min(2).max(100).optional(), department: z.string().trim().max(120).optional(), phone: z.string().trim().max(30).optional() });

@Controller("me")
export class MeController {
  constructor(private readonly meService: MeService) {}

  @Get()
  getMe(@CurrentUser() user: { id: string }, @CurrentTenant() tenant: TenantContext | undefined) {
    return this.meService.getMe(user.id, tenant?.organizationId ?? null);
  }

  @Patch()
  @HttpCode(200)
  update(@CurrentUser() user: { id: string }, @Body({ schema: UpdateProfileDto }) dto: z.infer<typeof UpdateProfileDto>, @CurrentTenant() tenant: TenantContext | undefined) {
    return this.meService.updateProfile(user.id, dto, tenant);
  }
}
