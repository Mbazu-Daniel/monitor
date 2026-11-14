import { isSpanContextValid, trace } from "@opentelemetry/api";

export interface TraceContext {
  traceId: string;
  spanId: string;
}

export function activeTraceContext(): TraceContext | undefined {
  const context = trace.getActiveSpan()?.spanContext();
  if (!context || !isSpanContextValid(context)) return undefined;
  return { traceId: context.traceId, spanId: context.spanId };
}
