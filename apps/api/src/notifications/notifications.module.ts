import { Module } from "@nestjs/common";
import { NotificationsController } from "./notifications.controller.ts";
import { NotificationAnnouncer } from "./notification-announcer.ts";
import { NotificationInbox } from "./notification-inbox.ts";
import { NotificationSweeper } from "./notification-sweeper.ts";

@Module({
  controllers: [NotificationsController],
  providers: [NotificationAnnouncer, NotificationInbox, NotificationSweeper],
  exports: [NotificationAnnouncer],
})
export class NotificationsModule {}
