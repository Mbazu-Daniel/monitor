import { Body, Controller, Get, Param, Patch, Post, Query, HttpCode } from "@nestjs/common";
import { RequirePermission } from "../common/decorators/permissions.decorator.ts";
import { CurrentTenant, CurrentUser } from "../common/decorators/current-tenant.decorator.ts";
import type { TenantContext } from "../common/guards/session.types.ts";
import { UsersService } from "./users.service.ts";
import { UserReportingService } from "./user-reporting.ts";
import { CreateUserDto, UpdateUserDto } from "./users.dto.ts";
import { listQuerySchema, type ListQuery } from "../common/dto/list-query.dto.ts";

@Controller("users")
export class UsersController {
  constructor(private readonly users: UsersService, private readonly reporting: UserReportingService) {}

  @RequirePermission("user", "manageStudents")
  @Get()
  list(@Query({ schema: listQuerySchema }) query: ListQuery, @CurrentTenant() tenant: TenantContext | undefined) {
    return this.reporting.list(query, tenant?.organizationId ?? null, tenant?.role ?? null);
  }

  @RequirePermission("user", "manageStudents")
  @Post()
  @HttpCode(201)
  create(@Body({ schema: CreateUserDto }) dto: CreateUserDto, @CurrentUser() user: { id: string; name: string }, @CurrentTenant() tenant: TenantContext | undefined) {
    return this.users.create(dto, user, tenant);
  }

  @RequirePermission("user", "manageStudents")
  @Patch(":id")
  @HttpCode(200)
  update(@Param("id") id: string, @Body({ schema: UpdateUserDto }) dto: UpdateUserDto, @CurrentUser() user: { id: string; name: string }, @CurrentTenant() tenant: TenantContext | undefined) {
    return this.users.update(id, dto, user, tenant);
  }
}
