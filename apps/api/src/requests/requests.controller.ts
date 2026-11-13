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
import { RequestMutationsService } from "./service-request-mutations.service.ts";
import { AssignmentsService } from "./assignments.service.ts";
import { StatusChangeService } from "./status-change.service.ts";
import { CommentsService } from "./comments.service.ts";
import { AssignDto, CommentDto, CreateRequestDto, StatusUpdateDto, UpdateRequestDto } from "./requests.dto.ts";
import { listQuerySchema, type ListQuery } from "../common/dto/list-query.dto.ts";
import type { TenantContext } from "../common/guards/session.guard.ts";

@Controller("requests")
export class RequestsController {
  constructor(
    private readonly requests: RequestsService,
    private readonly mutations: RequestMutationsService,
    private readonly assignments: AssignmentsService,
    private readonly statusChanges: StatusChangeService,
    private readonly commentService: CommentsService,
  ) {}

  @Get()
  list(@Query({ schema: listQuerySchema }) query: ListQuery, @CurrentTenant() tenant: TenantContext | undefined) {
    return this.requests.listFor(query, tenant);
  }

  @Post()
  @HttpCode(201)
  create(@Body({ schema: CreateRequestDto }) dto: CreateRequestDto, @CurrentUser() user: { id: string; name: string }, @CurrentTenant() tenant: TenantContext | undefined) {
    return this.mutations.create(user, dto, tenant);
  }

  @Get(":id")
  detail(@Param("id") id: string, @CurrentTenant() tenant: TenantContext | undefined) {
    return this.requests.getDetail(id, tenant);
  }

  @Patch(":id")
  @HttpCode(200)
  update(@Param("id") id: string, @Body({ schema: UpdateRequestDto }) dto: UpdateRequestDto, @CurrentUser() user: { id: string; name: string }, @CurrentTenant() tenant: TenantContext | undefined) {
    return this.mutations.update(user, id, dto, tenant);
  }

  @Delete(":id")
  remove(@Param("id") id: string, @CurrentUser() user: { id: string; name: string }, @CurrentTenant() tenant: TenantContext | undefined) {
    return this.mutations.remove(user, id, tenant);
  }

  @Post(":id/status")
  @HttpCode(200)
  status(@Param("id") id: string, @Body({ schema: StatusUpdateDto }) dto: StatusUpdateDto, @CurrentUser() user: { id: string; name: string }, @CurrentTenant() tenant: TenantContext | undefined) {
    return this.statusChanges.changeStatus(user, id, dto, tenant);
  }

  @RequirePermission("request", "assign")
  @Post(":id/assign")
  @HttpCode(201)
  assign(@Param("id") id: string, @Body({ schema: AssignDto }) dto: AssignDto, @CurrentUser() user: { id: string; name: string }, @CurrentTenant() tenant: TenantContext | undefined) {
    return this.assignments.assign(user, id, dto, tenant);
  }

  @RequirePermission("request", "assign")
  @Delete(":id/assign")
  unassign(@Param("id") id: string, @CurrentUser() user: { id: string; name: string }, @CurrentTenant() tenant: TenantContext | undefined) {
    return this.assignments.unassign(user, id, tenant);
  }

  @Get(":id/comments")
  comments(@Param("id") id: string, @CurrentTenant() tenant: TenantContext | undefined) {
    return this.requests.listComments(id, tenant);
  }

  @Post(":id/comments")
  @HttpCode(201)
  addComment(@Param("id") id: string, @Body({ schema: CommentDto }) dto: CommentDto, @CurrentUser() user: { id: string; name: string }, @CurrentTenant() tenant: TenantContext | undefined) {
    return this.commentService.createComment(user, id, dto, tenant);
  }
}
