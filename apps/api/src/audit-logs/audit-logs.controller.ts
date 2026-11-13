import { Controller, Get, Query } from "@nestjs/common";
import { RequirePermission } from "../common/decorators/permissions.decorator.ts";
import { CurrentTenant } from "../common/decorators/current-tenant.decorator.ts";
import { AuditLogsService } from "./audit-logs.service.ts";
import { listQuerySchema, type ListQuery } from "../common/dto/list-query.dto.ts";
import type { TenantContext } from "../common/guards/session.guard.ts";

@RequirePermission("audit", "read")
@Controller("audit-logs")
export class AuditLogsController {
  constructor(private readonly auditLogs: AuditLogsService) {}

  @Get()
  list(@Query({ schema: listQuerySchema }) query: ListQuery, @CurrentTenant() tenant: TenantContext | undefined) {
    return this.auditLogs.list(query, tenant?.organizationId ?? null);
  }
}
