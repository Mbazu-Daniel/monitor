import { CallHandler, ConflictException, Inject, Injectable, type NestInterceptor, type ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { createHash } from "node:crypto";
import type { NodeRequest as Request, NodeResponse as Response } from "@nestjs/platform-node";
import type { PrismaClient } from "../../generated/prisma/client.ts";
import { of, throwError, type Observable } from "rxjs";
import { catchError, mergeMap } from "rxjs/operators";
import { PRISMA } from "../constants/prisma-token.ts";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator.ts";
import { isUniqueViolation } from "../db-errors.ts";
import { logger } from "../logger.ts";

const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

interface RequestWithUser extends Request {
  user?: { id?: string } | undefined;
}

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(@Inject(PRISMA) private readonly db: PrismaClient, private readonly reflector: Reflector) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const req = context.switchToHttp().getRequest<RequestWithUser>();
    const keyHeader = req.headers["idempotency-key"];
    const key = typeof keyHeader === "string" ? keyHeader.trim() : "";
    if (!key || req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
      return next.handle();
    }

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()]);
    if (isPublic) {
      return next.handle();
    }

    const scope = `${req.user?.id ?? "anon"}:${req.method}:${context.getClass().name}.${context.getHandler().name}`;
    const requestHash = createHash("sha256").update(JSON.stringify({ path: req.originalUrl ?? req.url, body: req.body ?? null })).digest("hex");

    await this.db.idempotencyKey.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - IDEMPOTENCY_TTL_MS) } } }).catch(() => undefined);

    const inserted = await this.tryInsert(scope, key, requestHash);
    if (inserted) {
      return this.runAndComplete(context, next, scope, key);
    }

    const existing = await this.db.idempotencyKey.findUnique({ where: { scope_key: { scope, key } } });
    if (existing && existing.requestHash !== requestHash) {
      throw new ConflictException("This Idempotency-Key was already used with a different request.");
    }
    if (existing?.status === "COMPLETED") {
      const res = context.switchToHttp().getResponse<Response>();
      res.status(existing.statusCode ?? 200);
      res.setHeader("Idempotent-Replay", "true");
      return of(existing.response ? JSON.parse(existing.response) : null);
    }
    if (existing?.status === "FAILED") {
      const retried = await this.db.idempotencyKey.deleteMany({ where: { id: existing.id, status: "FAILED" } });
      if (retried.count === 1 && (await this.tryInsert(scope, key, requestHash))) {
        return this.runAndComplete(context, next, scope, key);
      }
    }
    throw new ConflictException("A request with this Idempotency-Key is already being processed. Retry shortly.");
  }

  private async tryInsert(scope: string, key: string, requestHash: string): Promise<boolean> {
    try {
      await this.db.idempotencyKey.create({ data: { scope, key, requestHash, status: "IN_PROGRESS" } });
      return true;
    } catch (error) {
      if (isUniqueViolation(error)) return false;
      throw error;
    }
  }

  private runAndComplete(context: ExecutionContext, next: CallHandler, scope: string, key: string): Observable<unknown> {
    return next.handle().pipe(
      mergeMap(async (body) => {
        const res = context.switchToHttp().getResponse<Response>();
        const statusCode = typeof res.statusCode === "number" ? res.statusCode : 200;
        await this.db.idempotencyKey.update({
          where: { scope_key: { scope, key } },
          data: { status: "COMPLETED", statusCode, response: JSON.stringify(body ?? null) },
        }).catch((error: unknown) => logger.error({ err: error, scope }, "[METRIC] idempotency_store_failed"));
        return body as unknown;
      }),
      catchError(async (error) => {
        await this.db.idempotencyKey.updateMany({ where: { scope_key: { scope, key }, status: "IN_PROGRESS" }, data: { status: "FAILED" } }).catch(() => undefined);
        return throwError(() => error);
      }),
    );
  }
}
