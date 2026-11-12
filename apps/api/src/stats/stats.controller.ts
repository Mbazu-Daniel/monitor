import { Controller, Get } from "@nestjs/common";
import { RequirePermission } from "../common/decorators/permissions.decorator.ts";
import { CurrentTenant } from "../common/decorators/current-tenant.decorator.ts";
import type { TenantContext } from "../common/guards/session.guard.ts";
import { StatsService } from "./stats.service.ts";

@Controller("stats")
export class StatsController {
  constructor(private readonly stats: StatsService) {}

  @Get("personal")
  @RequirePermission("stats", "personal")
  personal(@CurrentTenant() tenant: TenantContext | undefined) {
    return this.stats.getPersonalStats(tenant);
  }

  @Get("officer")
  @RequirePermission("stats", "officer")
  officer(@CurrentTenant() tenant: TenantContext | undefined) {
    return this.stats.getOfficerStats(tenant);
  }

  @Get("admin")
  @RequirePermission("stats", "admin")
  admin(@CurrentTenant() tenant: TenantContext | undefined) {
    return this.stats.getAdminStats(tenant);
  }
}
