import { Body, Controller, Get, Post, Patch, Query, Req, BadRequestException, HttpCode } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { NodeRequest as Request } from "@nestjs/platform-node";
import { Public } from "../common/decorators/public.decorator.ts";
import { CurrentUser, CurrentTenant } from "../common/decorators/current-tenant.decorator.ts";
import { RequirePermission } from "../common/decorators/permissions.decorator.ts";
import type { TenantContext } from "../common/guards/session.types.ts";
import { OrganizationsService } from "./organizations.service.ts";
import { CreateOrganizationDto, JoinOrganizationDto, UpdateOrganizationCodeDto } from "./organizations.dto.ts";

@Controller("organizations")
export class OrganizationsController {
  constructor(private readonly orgs: OrganizationsService) {}

  @Get()
  mine(@CurrentUser() user: { id: string }) {
    return this.orgs.listMine(user.id);
  }

  
  @Public()
  @Get("resolve")
  resolve(@Query("code") code?: string) {
    if (!code?.trim()) throw new BadRequestException("Enter a campus code.");
    return this.orgs.resolve(code.trim().toUpperCase());
  }

  
  @Post()
  @HttpCode(201)
  @Throttle({ default: { limit: 5, ttl: 3_600_000 } })
  create(
    @CurrentUser() user: { id: string },
    @Body({ schema: CreateOrganizationDto }) dto: CreateOrganizationDto,
    @Req() req: Request,
  ) {
    return this.orgs.create(user.id, dto, req.headers.cookie);
  }

  
  @Post("join")
  @HttpCode(201)
  join(@CurrentUser() user: { id: string }, @Body({ schema: JoinOrganizationDto }) dto: JoinOrganizationDto) {
    return this.orgs.join(user.id, dto);
  }

  @RequirePermission("organization", "update")
  @Patch("code")
  @HttpCode(200)
  updateCode(
    @Body({ schema: UpdateOrganizationCodeDto }) dto: UpdateOrganizationCodeDto,
    @CurrentUser() user: { id: string },
    @CurrentTenant() tenant: TenantContext | undefined,
  ) {
    return this.orgs.updateCode(tenant?.organizationId ?? null, user.id, dto.code, tenant?.memberId ?? null);
  }
}
