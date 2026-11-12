import { Body, Controller, Delete, HttpCode, Param, Post } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { CurrentTenant, CurrentUser } from "../common/decorators/current-tenant.decorator.ts";
import type { TenantContext } from "../common/guards/session.guard.ts";
import { AttachmentsService } from "./attachments.service.ts";
import { CreateAttachmentUploadDto } from "./attachments.dto.ts";

@Controller("requests/:requestId/attachments")
export class AttachmentsController {
  constructor(private readonly attachments: AttachmentsService) {}

  @Post("upload-url")
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  createUploadUrl(
    @Param("requestId") requestId: string,
    @CurrentUser() user: { id: string; name: string },
    @CurrentTenant() tenant: TenantContext | undefined,
    @Body({ schema: CreateAttachmentUploadDto }) dto: CreateAttachmentUploadDto,
  ) {
    return this.attachments.createUploadUrl(requestId, user, tenant, dto);
  }

  @Post(":attachmentId/confirm")
  @HttpCode(200)
  confirmUpload(
    @Param("requestId") requestId: string,
    @Param("attachmentId") attachmentId: string,
    @CurrentUser() user: { id: string; name: string },
    @CurrentTenant() tenant: TenantContext | undefined,
  ) {
    return this.attachments.confirmUpload(requestId, attachmentId, user, tenant);
  }

  @Delete(":attachmentId")
  deleteAttachment(
    @Param("requestId") requestId: string,
    @Param("attachmentId") attachmentId: string,
    @CurrentUser() user: { id: string; name: string },
    @CurrentTenant() tenant: TenantContext | undefined,
  ) {
    return this.attachments.deleteAttachment(requestId, attachmentId, user, tenant);
  }
}
