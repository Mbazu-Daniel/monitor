import { Module } from "@nestjs/common";
import { NotificationsController } from "./notifications.controller.ts";
import { NotificationAnnouncer } from "./notification-announcer.ts";
import { NotificationInbox } from "./notification-inbox.ts";

@Module({
  controllers: [NotificationsController],
  providers: [NotificationAnnouncer, NotificationInbox],
  exports: [NotificationAnnouncer],
})
export class NotificationsModule {}
