import { Controller, Sse } from "@nestjs/common";
import type { MessageEvent } from "@nestjs/common";
import type { Observable } from "rxjs";
import { CurrentTenant } from "../common/decorators/current-tenant.decorator.ts";
import { RealtimeService } from "./realtime.service.ts";
import type { TenantContext } from "../common/guards/session.guard.ts";

@Controller("realtime")
export class RealtimeController {
  constructor(private readonly events: RealtimeService) {}

  @Sse("stream")
  stream(@CurrentTenant() tenant: TenantContext | undefined): Observable<MessageEvent> {
    return this.events.streamFor(tenant?.organizationId ?? null);
  }
}
