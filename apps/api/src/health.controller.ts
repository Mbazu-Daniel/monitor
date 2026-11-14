import { Controller, Get, Inject, ServiceUnavailableException } from "@nestjs/common";
import type { PrismaClient } from "./generated/prisma/client.ts";
import { PRISMA } from "./common/constants/prisma-token.ts";
import { Public } from "./common/decorators/public.decorator.ts";

const READINESS_TIMEOUT_MS = 1_500;

@Public()
@Controller("health")
export class HealthController {
  constructor(@Inject(PRISMA) private readonly db: PrismaClient) {}

  @Get()
  check() {
    return { status: "ok", timestamp: new Date().toISOString() };
  }

  @Get("ready")
  async ready() {
    try {
      await Promise.race([
        this.db.$queryRaw`SELECT 1`,
        new Promise((_resolve, reject) => setTimeout(() => reject(new Error("database did not answer within 1.5s")), READINESS_TIMEOUT_MS)),
      ]);
    } catch (error) {
      throw new ServiceUnavailableException({
        status: "not_ready",
        reason: error instanceof Error ? error.message : "database unreachable",
      });
    }
    return { status: "ready", timestamp: new Date().toISOString() };
  }
}
