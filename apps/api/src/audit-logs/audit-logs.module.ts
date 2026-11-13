import { Module } from "@nestjs/common";
import { AuditLogsController } from "./audit-logs.controller.ts";
import { AuditLogsService } from "./audit-logs.service.ts";

@Module({
  controllers: [AuditLogsController],
  providers: [AuditLogsService],
})
export class AuditLogsModule {}
