import { Global, Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { prisma } from "./prisma.ts";
import { PRISMA } from "./constants/prisma-token.ts";
import { AuditSink } from "./audit/audit.ts";
import { IdempotencyInterceptor } from "./idempotency/idempotency.interceptor.ts";

@Global()
@Module({
  providers: [{ provide: PRISMA, useValue: prisma }, AuditSink, { provide: APP_INTERCEPTOR, useClass: IdempotencyInterceptor }],
  exports: [PRISMA, AuditSink],
})
export class CommonModule {}
