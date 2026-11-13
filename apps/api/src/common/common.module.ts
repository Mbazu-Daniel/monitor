import { Global, Module } from "@nestjs/common";
import { prisma } from "./prisma.ts";
import { PRISMA } from "./constants/prisma-token.ts";
import { AuditSink } from "./audit/audit.ts";

@Global()
@Module({
  providers: [{ provide: PRISMA, useValue: prisma }, AuditSink],
  exports: [PRISMA, AuditSink],
})
export class CommonModule {}
