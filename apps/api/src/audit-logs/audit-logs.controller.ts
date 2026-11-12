import { Controller, Get, Query } from "@nestjs/common";
import { RequirePermission } from "../common/decorators/permissions.decorator.ts";
import { CurrentTenant } from "../common/decorators/current-tenant.decorator.ts";
import { AuditLogsService } from "./audit-logs.service.ts";

@RequirePermission("audit", "read")
@Controller("audit-logs")
export class AuditLogsController {
  constructor(private readonly auditLogs: AuditLogsService) {}

  @Get()
  list(@Query() query: Record<string, unknown>, @CurrentTenant() tenant: { organizationId: string | null }) {
    return this.auditLogs.list(query, tenant.organizationId);
  }
}
