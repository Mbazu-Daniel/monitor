import { Module } from "@nestjs/common";
import { StatsController } from "./stats.controller.ts";
import { StatsService } from "./stats.service.ts";

@Module({
  controllers: [StatsController],
  providers: [StatsService],
})
export class StatsModule {}
