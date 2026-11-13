import { Module } from "@nestjs/common";
import { RequestsController } from "./requests.controller.ts";
import { RequestsService } from "./requests.service.ts";
import { RequestMutationsService } from "./service-request-mutations.service.ts";
import { AssignmentsService } from "./assignments.service.ts";
import { StatusChangeService } from "./status-change.service.ts";
import { CommentsService } from "./comments.service.ts";
import { NotificationsModule } from "../notifications/notifications.module.ts";
import { AttachmentsModule } from "../attachments/attachments.module.ts";

@Module({
  imports: [NotificationsModule, AttachmentsModule],
  controllers: [RequestsController],
  providers: [RequestsService, RequestMutationsService, AssignmentsService, StatusChangeService, CommentsService],
})
export class RequestsModule {}
