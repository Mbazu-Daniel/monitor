import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AuthGuard } from "./common/guards/auth.guard.ts";
import { PermissionsGuard } from "./common/guards/permissions.guard.ts";
import { AuthController } from "./auth/auth.controller.ts";
import { HealthController } from "./health.controller.ts";
import { WelcomeController } from "./welcome.controller.ts";
import { MeModule } from "./me/me.module.ts";
import { OrganizationsModule } from "./organizations/organizations.module.ts";
import { UsersModule } from "./users/users.module.ts";
import { CategoriesModule } from "./categories/categories.module.ts";
import { RequestsModule } from "./requests/requests.module.ts";
import { NotificationsModule } from "./notifications/notifications.module.ts";
import { AuditLogsModule } from "./audit-logs/audit-logs.module.ts";
import { StatsModule } from "./stats/stats.module.ts";
import { ExportModule } from "./export/export.module.ts";
import { AttachmentsModule } from "./attachments/attachments.module.ts";
import { RealtimeModule } from "./realtime/realtime.module.ts";
import { CommonModule } from "./common/common.module.ts";

@Module({
  imports: [
    CommonModule,
    ThrottlerModule.forRoot([{ name: "default", ttl: 60_000, limit: 300 }]),
    MeModule,
    OrganizationsModule,
    UsersModule,
    CategoriesModule,
    RequestsModule,
    NotificationsModule,
    AuditLogsModule,
    StatsModule,
    ExportModule,
    AttachmentsModule,
    RealtimeModule,
  ],
  controllers: [AuthController, HealthController, WelcomeController],
  providers: [
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
