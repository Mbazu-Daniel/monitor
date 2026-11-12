import { Module } from "@nestjs/common";
import { RequestsController } from "./requests.controller.ts";
import { RequestsService } from "./requests.service.ts";
import { ServiceRequestLifecycleService } from "./service-request-lifecycle.ts";
import { NotificationsModule } from "../notifications/notifications.module.ts";
import { AttachmentsModule } from "../attachments/attachments.module.ts";

@Module({
  imports: [NotificationsModule, AttachmentsModule],
  controllers: [RequestsController],
  providers: [RequestsService, ServiceRequestLifecycleService],
})
export class RequestsModule {}
