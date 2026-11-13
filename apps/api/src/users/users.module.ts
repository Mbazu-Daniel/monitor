import { Module } from "@nestjs/common";
import { UsersController } from "./users.controller.ts";
import { UsersService } from "./users.service.ts";
import { UserReportingService } from "./user-reporting.ts";

@Module({
  controllers: [UsersController],
  providers: [UsersService, UserReportingService],
})
export class UsersModule {}
