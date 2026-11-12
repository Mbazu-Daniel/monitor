import { Module } from "@nestjs/common";
import { ExportController } from "./export.controller.ts";
import { ExportService } from "./export.service.ts";

@Module({
  controllers: [ExportController],
  providers: [ExportService],
})
export class ExportModule {}
