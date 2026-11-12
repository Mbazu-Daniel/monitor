import { Body, Controller, Delete, Get, Param, Patch, Post, HttpCode } from "@nestjs/common";
import { RequirePermission } from "../common/decorators/permissions.decorator.ts";
import { CurrentTenant, CurrentUser } from "../common/decorators/current-tenant.decorator.ts";
import { CategoriesService } from "./categories.service.ts";
import { CategoryDto } from "./categories.dto.ts";
import type { TenantContext } from "../common/guards/session.guard.ts";

@Controller("categories")
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  list(@CurrentTenant() tenant: TenantContext | undefined) {
    return this.categories.list(tenant?.organizationId ?? null);
  }

  @RequirePermission("category", "manage")
  @Post()
  @HttpCode(201)
  create(@Body({ schema: CategoryDto }) dto: CategoryDto, @CurrentUser() user: { id: string; name: string }, @CurrentTenant() tenant: TenantContext | undefined) {
    return this.categories.create(dto, user, tenant);
  }

  @RequirePermission("category", "manage")
  @Patch(":id")
  @HttpCode(200)
  update(@Param("id") id: string, @Body({ schema: CategoryDto.partial() }) dto: Partial<CategoryDto>, @CurrentUser() user: { id: string; name: string }, @CurrentTenant() tenant: TenantContext | undefined) {
    return this.categories.update(id, dto, user, tenant);
  }

  @RequirePermission("category", "manage")
  @Delete(":id")
  delete(@Param("id") id: string, @CurrentUser() user: { id: string; name: string }, @CurrentTenant() tenant: TenantContext | undefined) {
    return this.categories.remove(id, user, tenant);
  }
}
