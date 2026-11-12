import { Controller, Get, Query, Res } from "@nestjs/common";
import type { NodeResponse as Response } from "@nestjs/platform-node";
import { RequirePermission } from "../common/decorators/permissions.decorator.ts";
import { CurrentTenant, CurrentUser } from "../common/decorators/current-tenant.decorator.ts";
import { ExportService } from "./export.service.ts";
import { AuditSink } from "../common/utils/audit.ts";

@RequirePermission("report", "export")
@Controller("export")
export class ExportController {
  constructor(private readonly exporter: ExportService, private readonly auditSink: AuditSink) {}

  @Get("requests")
  async requests(@Query() query: Record<string, unknown>, @CurrentUser() user: { id: string; name: string }, @CurrentTenant() tenant: import("../common/guards/session.guard.ts").TenantContext, @Res({ passthrough: true }) res: Response) {
    const { csv, count } = await this.exporter.requestsCsv(query, user, tenant);
    await this.auditSink.platform({ userId: user.id, memberId: tenant?.memberId ?? null, action: "DATA_EXPORTED", entityType: "REQUEST", entityId: null, details: `${user.name} exported ${count} request(s) to CSV`, organizationId: tenant?.organizationId ?? null });
    const date = new Date().toISOString().slice(0, 10);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="mivacampus-requests-${date}.csv"`);
    return csv;
  }
}
