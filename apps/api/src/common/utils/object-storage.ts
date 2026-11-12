import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { BadRequestException, Injectable, Logger, type OnModuleInit } from "@nestjs/common";
import { randomUUID } from "node:crypto";

const UPLOAD_URL_TTL_SECONDS = 900;
const DOWNLOAD_URL_TTL_SECONDS = 3600;

function readStorageConfig(env: NodeJS.ProcessEnv = process.env) {
  const endpoint = env.STORAGE_ENDPOINT?.trim();
  const accountId = env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = env.R2_SECRET_ACCESS_KEY?.trim();
  const bucket = env.R2_BUCKET_NAME?.trim();

  if (!endpoint && !accountId) return undefined;
  if (!accessKeyId || !secretAccessKey || !bucket) return undefined;

  const isLocalEndpoint = Boolean(endpoint);
  return {
    endpoint: endpoint ?? `https://${accountId}.r2.cloudflarestorage.com`,
    region: isLocalEndpoint ? "us-east-1" : "auto",
    bucket,
    forcePathStyle: isLocalEndpoint,
    accessKeyId,
    secretAccessKey,
  };
}

export interface StoredObjectMeta {
  sizeBytes: number;
  contentType: string;
}

class ObjectStorageNotConfigured extends BadRequestException {
  constructor() {
    super("object storage is not configured");
  }
}

@Injectable()
export class ObjectStorage implements OnModuleInit {
  private readonly logger = new Logger(ObjectStorage.name);
  private readonly config = readStorageConfig();
  private readonly bucket = this.config?.bucket ?? "";
  private readonly client = this.config
    ? new S3Client({
        region: this.config.region,
        endpoint: this.config.endpoint,
        forcePathStyle: this.config.forcePathStyle,
        requestChecksumCalculation: "WHEN_REQUIRED",
        responseChecksumValidation: "WHEN_REQUIRED",
        credentials: {
          accessKeyId: this.config.accessKeyId,
          secretAccessKey: this.config.secretAccessKey,
        },
      })
    : null;

  async onModuleInit(): Promise<void> {
    if (!this.client) {
      this.logger.warn("R2_* not configured. Attachment uploads are disabled until a bucket is reachable");
      return;
    }

    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch (err) {
      if ((err as { name?: string; $metadata?: { httpStatusCode?: number } }).name === "NotFound") {
        await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
      } else {
        this.logger.warn(`Object storage check failed (${(err as Error).message}). Uploads will fail until storage is reachable`);
      }
    }
  }

  isConfigured(): boolean {
    return this.client !== null;
  }

  getUploadUrlTtlSeconds(): number {
    return UPLOAD_URL_TTL_SECONDS;
  }

  async fileUrl(key: string): Promise<string> {
    return this.presignDownloadUrl(key);
  }

  private requireClient(): S3Client {
    if (!this.client) throw new ObjectStorageNotConfigured();
    return this.client;
  }

  buildAttachmentKey(requestId: string, fileName: string): string {
    const safeName = fileName.replace(/[^\w.+-]+/g, "_").slice(-120);
    return `requests/${requestId}/attachments/${randomUUID()}-${safeName}`;
  }

  async presignUploadUrl(key: string, mimeType: string, sizeBytes?: number): Promise<string> {
    const client = this.requireClient();
    return getSignedUrl(
      client,
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: mimeType,
        ...(sizeBytes === undefined ? {} : { ContentLength: sizeBytes }),
      }),
      { expiresIn: UPLOAD_URL_TTL_SECONDS },
    );
  }

  async presignDownloadUrl(key: string): Promise<string> {
    const client = this.requireClient();
    return getSignedUrl(
      client,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: DOWNLOAD_URL_TTL_SECONDS },
    );
  }

  async headObject(key: string): Promise<StoredObjectMeta | null> {
    const client = this.requireClient();
    try {
      const res = await client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return {
        sizeBytes: res.ContentLength ?? 0,
        contentType: res.ContentType ?? "application/octet-stream",
      };
    } catch (err) {
      const status = (err as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
      if (status === 404 || status === 403) return null;
      throw err;
    }
  }

  async deleteObject(key: string): Promise<void> {
    const client = this.requireClient();
    await client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}
