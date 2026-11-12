import { Global, Module } from "@nestjs/common";
import { prisma } from "./utils/prisma.ts";
import { PRISMA } from "./constants/prisma-token.ts";
import { AuditSink } from "./utils/audit.ts";

@Global()
@Module({
  providers: [{ provide: PRISMA, useValue: prisma }, AuditSink],
  exports: [PRISMA, AuditSink],
})
export class CommonModule {}
