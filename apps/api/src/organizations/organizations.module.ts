import { Module } from "@nestjs/common";
import { OrganizationsController } from "./organizations.controller.ts";
import { OrganizationsService } from "./organizations.service.ts";

@Module({
  controllers: [OrganizationsController],
  providers: [OrganizationsService],
})
export class OrganizationsModule {}
