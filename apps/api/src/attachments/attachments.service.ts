import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PRISMA } from "../common/constants/prisma-token.ts";
import type { PrismaClient } from "../generated/prisma/client.ts";
import { MAX_IMAGE_MIME_TYPES, MAX_UPLOAD_BYTES } from "@mivacampus/contracts";
import type { TenantContext } from "../common/guards/session.types.ts";
import { TenantScope } from "../common/tenancy/tenant-scope.ts";
import { canAttach } from "@mivacampus/contracts";
import { ObjectStorage, UPLOAD_URL_TTL_SECONDS } from "./object-storage.ts";
import { logger } from "../common/logger.ts";
import { scopedRequestLookup } from "../requests/request-access.ts";
import type { CreateAttachmentUploadDto } from "./attachments.dto.ts";

@Injectable()
export class AttachmentsService {
  constructor(private readonly storage: ObjectStorage, @Inject(PRISMA) private readonly db: PrismaClient) {}

  private async loadRequestFor(requestId: string, tenant: TenantContext | undefined) {
    const scope = TenantScope.of(tenant);
    const request = await this.db.serviceRequest.findFirst({
      where: scopedRequestLookup(scope, requestId),
      include: { assignments: { where: { isActive: true }, select: { officerId: true, isActive: true } } },
    });
    if (!request) throw new NotFoundException("Request not found.");
    return request;
  }

  private withUploadUrls<A extends { key: string; status: string }>(attachments: A[]): Promise<(A & { fileUrl: string | null })[]> {
    return Promise.all(
      attachments.map(async (attachment) => {
        if (attachment.status !== "READY" || !this.storage.isConfigured()) {
          return { ...attachment, fileUrl: null };
        }
        try {
          return { ...attachment, fileUrl: await this.storage.presignDownloadUrl(attachment.key) };
        } catch (err) {
          logger.warn({ err, attachment: attachment.key }, "[ATTACHMENT_URL_FAILED]");
          return { ...attachment, fileUrl: null };
        }
      }),
    );
  }

  async createUploadUrl(requestId: string, user: { id: string; name: string }, tenant: TenantContext | undefined, dto: CreateAttachmentUploadDto) {
    const organizationId = tenant?.organizationId ?? null;
    const memberId = tenant?.memberId ?? null;
    if (!organizationId || !memberId) throw new BadRequestException("You must be in a campus to attach evidence.");

    const request = await this.loadRequestFor(requestId, tenant);
    if (!canAttach({ role: tenant?.role, id: tenant?.memberId }, request)) {
      throw new ForbiddenException("Only the request creator, an assigned officer, or an administrator can add evidence.");
    }

    const expiresAt = new Date(Date.now() + UPLOAD_URL_TTL_SECONDS * 1000);
    const key = this.storage.buildAttachmentKey(requestId, dto.fileName);
    const uploadUrl = await this.storage.presignUploadUrl(key, dto.mimeType, dto.sizeBytes);
    const attachment = await this.db.attachment.create({
      data: {
        requestId,
        uploadedById: memberId,
        key,
        fileName: dto.fileName,
        mimeType: dto.mimeType,
        sizeBytes: dto.sizeBytes ?? null,
        status: "PENDING",
        uploadExpiresAt: expiresAt,
      },
    });
    return {
      attachmentId: attachment.id,
      uploadUrl,
      key: attachment.key,
      expiresAt: expiresAt.toISOString(),
      maxBytes: MAX_UPLOAD_BYTES,
      allowedMimeTypes: MAX_IMAGE_MIME_TYPES,
    };
  }

  private async loadOwnAttachment(requestId: string, attachmentId: string, memberId: string | null, role: string | null | undefined, forbiddenMessage: string) {
    const attachment = await this.db.attachment.findFirst({ where: { id: attachmentId, requestId } });
    if (!attachment) throw new NotFoundException("Attachment not found.");
    if (attachment.uploadedById !== memberId && role !== "ADMIN") {
      throw new ForbiddenException(forbiddenMessage);
    }
    return attachment;
  }

  async confirmUpload(requestId: string, attachmentId: string, user: { id: string }, tenant: TenantContext | undefined) {
    const memberId = tenant?.memberId ?? null;
    if (!memberId) throw new BadRequestException("You must be in a campus to confirm an upload.");
    await this.loadRequestFor(requestId, tenant);

    const attachment = await this.loadOwnAttachment(requestId, attachmentId, memberId, tenant?.role, "Only the uploader can confirm this upload.");

    if (attachment.status === "READY") {
      const [withUrl] = await this.withUploadUrls([attachment]);
      return withUrl;
    }

    const meta = await this.storage.headObject(attachment.key);
    const fail = async (reason: string): Promise<never> => {
      await this.db.attachment.update({ where: { id: attachment.id }, data: { status: "FAILED" } });
      throw new BadRequestException(reason);
    };

    if (!meta) {
      return fail("that file has not been uploaded");
    }
    if (attachment.sizeBytes !== null && meta.sizeBytes !== attachment.sizeBytes) {
      await fail("the uploaded object does not have the declared size");
    }
    if (meta.contentType !== attachment.mimeType) {
      await fail("the uploaded object does not have the declared content type");
    }

    const ready = await this.db.attachment.update({
      where: { id: attachment.id },
      data: { status: "READY", sizeBytes: meta.sizeBytes, uploadExpiresAt: null },
    });
    const [withUrl] = await this.withUploadUrls([ready]);
    return withUrl;
  }

  async presign(attachments: { id: string; key: string; fileName: string; mimeType: string; sizeBytes: number | null; status: string; createdAt: Date }[]) {
    return this.withUploadUrls(attachments);
  }

  async deleteAttachment(requestId: string, attachmentId: string, user: { id: string; name: string }, tenant: TenantContext | undefined) {
    const memberId = tenant?.memberId ?? null;
    await this.loadRequestFor(requestId, tenant);

    const attachment = await this.loadOwnAttachment(requestId, attachmentId, memberId, tenant?.role, "Only the uploader or an administrator can delete this attachment.");

    if (this.storage.isConfigured()) {
      try {
        await this.storage.deleteObject(attachment.key);
      } catch (err) {
        logger.warn({ err, key: attachment.key }, "[ATTACHMENT_DELETE_FAILED] object left in bucket");
      }
    }
    await this.db.attachment.delete({ where: { id: attachment.id } });
    return { deleted: true };
  }

  async deleteObjectsForRequest(requestId: string): Promise<void> {
    if (!this.storage.isConfigured()) return;
    const rows = await this.db.attachment.findMany({ where: { requestId }, select: { key: true } });
    for (const row of rows) {
      try {
        await this.storage.deleteObject(row.key);
      } catch (err) {
        logger.warn({ err, key: row.key }, "[ATTACHMENT_DELETE_FAILED] object left in bucket");
      }
    }
  }
}
