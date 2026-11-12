import { Body, Controller, Get, Post, Query, Req, BadRequestException, HttpCode } from "@nestjs/common";
import type { NodeRequest as Request } from "@nestjs/platform-node";
import { Public } from "../common/decorators/public.decorator.ts";
import { CurrentUser } from "../common/decorators/current-tenant.decorator.ts";
import { OrganizationsService } from "./organizations.service.ts";
import { CreateOrganizationDto, JoinOrganizationDto } from "./organizations.dto.ts";

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
    return this.orgs.resolve(code.trim().toLowerCase());
  }

  
  @Post()
  @HttpCode(201)
  create(
    @CurrentUser() user: { id: string },
    @Body({ schema: CreateOrganizationDto }) dto: CreateOrganizationDto,
    @Req() req: Request,
  ) {
    return this.orgs.create(user.id, dto, req.headers as Record<string, string>);
  }

  
  @Post("join")
  @HttpCode(201)
  join(@CurrentUser() user: { id: string }, @Body({ schema: JoinOrganizationDto }) dto: JoinOrganizationDto) {
    return this.orgs.join(user.id, dto);
  }
}
