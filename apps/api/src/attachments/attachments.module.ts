import { Module } from "@nestjs/common";
import { AttachmentsController } from "./attachments.controller.ts";
import { AttachmentsService } from "./attachments.service.ts";
import { ObjectStorage } from "./object-storage.ts";

@Module({
  controllers: [AttachmentsController],
  providers: [ObjectStorage, AttachmentsService],
  exports: [AttachmentsService],
})
export class AttachmentsModule {}
