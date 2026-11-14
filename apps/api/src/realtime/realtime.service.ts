import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { Client } from "pg";
import { Subject, filter, interval, map, merge, type Observable } from "rxjs";
import { getConfig } from "../common/config/env.ts";
import { logger } from "../common/logger.ts";

export type CampusEventType = "REQUEST_CREATED" | "REQUEST_STATUS_CHANGED" | "REQUEST_ASSIGNED" | "REQUEST_UNASSIGNED" | "REQUEST_COMMENT";

export type CampusEvent = {
  type: CampusEventType;
  organizationId: string | null;
  requestId: string;
  reference: string;
  title: string;
  actorId: string;
  actorName: string;
  detail?: string | null;
  at: string;
};

const CHANNEL = "campus_events";
const HEARTBEAT_MS = 25_000;
const RECONNECT_DELAY_MS = 5_000;

@Injectable()
export class RealtimeService implements OnModuleInit, OnModuleDestroy {
  private readonly bus = new Subject<CampusEvent>();
  private client: Client | undefined;
  private reconnectTimer: NodeJS.Timeout | undefined;
  private shuttingDown = false;

  async onModuleInit() {
    if (process.env.NODE_ENV === "test") return;
    await this.connect();
  }

  async onModuleDestroy() {
    this.shuttingDown = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    await this.client?.end().catch(() => undefined);
  }

  private async connect() {
    try {
      const client = new Client({ connectionString: getConfig().DATABASE_URL, application_name: "mivacampus-realtime" });
      client.on("notification", (msg) => this.onNotification(msg.payload));
      client.on("error", (error: Error) => logger.error({ err: error }, "[REALTIME_PG_ERROR]"));
      client.on("end", () => this.scheduleReconnect());
      await client.connect();
      await client.query(`LISTEN ${CHANNEL}`);
      this.client = client;
      logger.info("[REALTIME] listening for campus events");
    } catch (error) {
      logger.error({ err: error }, "[REALTIME_CONNECT_FAILED] retrying shortly");
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.shuttingDown || this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      void this.connect();
    }, RECONNECT_DELAY_MS);
  }

  private onNotification(payload?: string) {
    try {
      const event = JSON.parse(payload ?? "") as CampusEvent;
      this.bus.next(event);
    } catch (error) {
      logger.warn({ err: error }, "[REALTIME_MALFORMED] ignoring payload");
    }
  }

  emit(event: Omit<CampusEvent, "at">) {
    const full = { ...event, at: new Date().toISOString() };
    if (!this.client) {
      this.bus.next(full);
      return;
    }
    this.client.query("SELECT pg_notify($1, $2)", [CHANNEL, JSON.stringify(full)]).catch((error: unknown) => {
      logger.error({ err: error }, "[REALTIME_NOTIFY_FAILED]");
      this.bus.next(full);
    });
  }

  streamFor(organizationId: string | null): Observable<MessageEvent> {
    const events = this.bus.pipe(
      filter((event) => event.organizationId === organizationId),
      map((event) => new MessageEvent("message", { data: event })),
    );
    const heartbeat = interval(HEARTBEAT_MS).pipe(
      map(() => new MessageEvent("ping", { data: "keepalive" })),
    );
    return merge(events, heartbeat);
  }
}
