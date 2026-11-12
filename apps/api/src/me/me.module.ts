import { Module } from "@nestjs/common";
import { MeController } from "./me.controller.ts";
import { MeService } from "./me.service.ts";

@Module({
  controllers: [MeController],
  providers: [MeService],
})
export class MeModule {}
