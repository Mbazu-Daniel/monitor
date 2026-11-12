import { Global, Module } from "@nestjs/common";
import { RealtimeController } from "./realtime.controller.ts";
import { RealtimeService } from "./realtime.service.ts";

@Global()
@Module({
  controllers: [RealtimeController],
  providers: [RealtimeService],
  exports: [RealtimeService],
})
export class RealtimeModule {}
