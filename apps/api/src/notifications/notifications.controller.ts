import { Controller, Get, NotFoundException, Param, Post, Query, HttpCode } from "@nestjs/common";
import { CurrentTenant, CurrentUser } from "../common/decorators/current-tenant.decorator.ts";
import type { TenantContext } from "../common/guards/session.types.ts";
import { NotificationInbox } from "./notification-inbox.ts";
import { listQuerySchema, type ListQuery } from "../common/dto/list-query.dto.ts";

@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notifications: NotificationInbox) {}

  @Get()
  list(@Query({ schema: listQuerySchema }) query: ListQuery, @CurrentUser() user: { id: string }, @CurrentTenant() tenant: TenantContext | undefined) {
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
