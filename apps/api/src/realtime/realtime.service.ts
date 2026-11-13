import { Injectable } from "@nestjs/common";
import { Subject, filter, map, type Observable } from "rxjs";

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

@Injectable()
export class RealtimeService {
  private readonly bus = new Subject<CampusEvent>();

  emit(event: Omit<CampusEvent, "at">) {
    this.bus.next({ ...event, at: new Date().toISOString() });
  }

  streamFor(organizationId: string | null): Observable<MessageEvent> {
    return this.bus.pipe(
      filter((event) => event.organizationId === organizationId),
      map((event) => new MessageEvent("message", { data: event })),
    );
  }
}
