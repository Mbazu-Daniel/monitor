"use client";

import { useEffect, useRef } from "react";

export type CampusEvent = {
  type: "REQUEST_CREATED" | "REQUEST_STATUS_CHANGED" | "REQUEST_ASSIGNED" | "REQUEST_UNASSIGNED" | "REQUEST_COMMENT";
  organizationId: string;
  requestId: string;
  reference: string;
  title: string;
  actorId: string;
  actorName: string;
  detail?: string | null;
  at: string;
};

export function useCampusEvents(onEvent: (event: CampusEvent) => void, requestId?: string) {
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;

  useEffect(() => {
    const source = new EventSource("/api/realtime/stream");
    source.onmessage = (message) => {
      try {
        const event = JSON.parse(message.data) as CampusEvent;
        if (requestId && event.requestId !== requestId && event.reference !== requestId) return;
        handlerRef.current(event);
      } catch {
      }
    };
    return () => source.close();
  }, [requestId]);
}
