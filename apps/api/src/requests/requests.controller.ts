import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { RequirePermission } from "../common/decorators/permissions.decorator.ts";
import { CurrentTenant, CurrentUser } from "../common/decorators/current-tenant.decorator.ts";
import { RequestsService } from "./requests.service.ts";
import { ServiceRequestLifecycleService } from "./service-request-lifecycle.ts";
import { AssignDto, CommentDto, CreateRequestDto, StatusUpdateDto, UpdateRequestDto } from "./requests.dto.ts";
import type { TenantContext } from "../common/guards/session.guard.ts";

@Controller("requests")
export class RequestsController {
  constructor(private readonly requests: RequestsService, private readonly lifecycle: ServiceRequestLifecycleService) {}

  @Get()
  list(@Query() query: Record<string, unknown>, @CurrentTenant() tenant: TenantContext | undefined) {
    return this.requests.listFor(query, tenant);
  }

  @Post()
  @HttpCode(201)
  create(@Body({ schema: CreateRequestDto }) dto: CreateRequestDto, @CurrentUser() user: { id: string; name: string }, @CurrentTenant() tenant: TenantContext | undefined) {
    return this.lifecycle.create(user, dto, tenant);
  }

  @Get(":id")
  detail(@Param("id") id: string, @CurrentTenant() tenant: TenantContext | undefined) {
    return this.requests.getDetail(id, tenant);
  }

  @Patch(":id")
  @HttpCode(200)
  update(@Param("id") id: string, @Body({ schema: UpdateRequestDto }) dto: UpdateRequestDto, @CurrentUser() user: { id: string; name: string }, @CurrentTenant() tenant: TenantContext | undefined) {
    return this.lifecycle.update(user, id, dto, tenant);
  }

  @Delete(":id")
  remove(@Param("id") id: string, @CurrentUser() user: { id: string; name: string }, @CurrentTenant() tenant: TenantContext | undefined) {
    return this.lifecycle.remove(user, id, tenant);
  }

  @Post(":id/status")
  @HttpCode(200)
  status(@Param("id") id: string, @Body({ schema: StatusUpdateDto }) dto: StatusUpdateDto, @CurrentUser() user: { id: string; name: string }, @CurrentTenant() tenant: TenantContext | undefined) {
    return this.lifecycle.changeStatus(user, id, dto, tenant);
  }

  @RequirePermission("request", "assign")
  @Post(":id/assign")
  @HttpCode(201)
  assign(@Param("id") id: string, @Body({ schema: AssignDto }) dto: AssignDto, @CurrentUser() user: { id: string; name: string }, @CurrentTenant() tenant: TenantContext | undefined) {
    return this.lifecycle.assign(user, id, dto, tenant);
  }

  @RequirePermission("request", "assign")
  @Delete(":id/assign")
  unassign(@Param("id") id: string, @CurrentUser() user: { id: string; name: string }, @CurrentTenant() tenant: TenantContext | undefined) {
    return this.lifecycle.unassign(user, id, tenant);
  }

  @Get(":id/comments")
  comments(@Param("id") id: string, @CurrentTenant() tenant: TenantContext | undefined) {
    return this.requests.listComments(id, tenant);
  }

  @Post(":id/comments")
  @HttpCode(201)
  addComment(@Param("id") id: string, @Body({ schema: CommentDto }) dto: CommentDto, @CurrentUser() user: { id: string; name: string }, @CurrentTenant() tenant: TenantContext | undefined) {
    return this.lifecycle.createComment(user, id, dto, tenant);
  }
}
