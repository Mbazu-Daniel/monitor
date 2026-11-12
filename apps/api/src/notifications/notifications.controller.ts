import { Controller, Get, NotFoundException, Param, Post, Query, HttpCode } from "@nestjs/common";
import { CurrentTenant, CurrentUser } from "../common/decorators/current-tenant.decorator.ts";
import type { TenantContext } from "../common/guards/session.guard.ts";
import { NotificationsService } from "./notifications.service.ts";

@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@Query() query: Record<string, unknown>, @CurrentUser() user: { id: string }, @CurrentTenant() tenant: TenantContext | undefined) {
    return this.notifications.list(user.id, tenant, query);
  }

  @Post(":id/read")
  @HttpCode(200)
  read(@Param("id") id: string, @CurrentUser() user: { id: string }, @CurrentTenant() tenant: TenantContext | undefined) {
    if (!id) throw new NotFoundException("Notification not found.");
    return this.notifications.markRead(user.id, id, tenant);
  }

  @Post("read-all")
  @HttpCode(200)
  readAll(@CurrentUser() user: { id: string }, @CurrentTenant() tenant: TenantContext | undefined) {
    return this.notifications.markAllRead(user.id, tenant);
  }
}
