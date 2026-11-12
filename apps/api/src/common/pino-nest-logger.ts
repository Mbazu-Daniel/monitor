import type { LoggerService } from "@nestjs/common";
import type { Logger } from "pino";

type LogPayload = Record<string, unknown>;

function toPayload(context?: string, extra?: unknown): LogPayload {
  const payload: LogPayload = {};
  if (context) payload.context = context;

  if (extra instanceof Error) {
    payload.err = extra;
    return payload;
  }
  if (extra && typeof extra === "object" && !Array.isArray(extra)) {
    return { ...extra, ...payload };
  }
  if (extra !== undefined) {
    payload.extra = extra;
  }
  return payload;
}

function splitNestArgs(
  optionalParams: unknown[],
): { context?: string; extra?: unknown } {
  if (optionalParams.length === 0) return {};
  if (optionalParams.length === 1) {
    const [first] = optionalParams;
    return typeof first === "string" ? { context: first } : { extra: first };
  }

  const last = optionalParams[optionalParams.length - 1];
  const rest = optionalParams.slice(0, -1);
  if (typeof last === "string") {
    return { context: last, extra: rest.length === 1 ? rest[0] : rest };
  }
  return { extra: optionalParams };
}

export class PinoNestLogger implements LoggerService {
  constructor(private readonly pino: Logger) {}

  log(message: any, ...optionalParams: unknown[]) {
    const { context, extra } = splitNestArgs(optionalParams);
    this.pino.info(toPayload(context, extra), message);
  }

  error(message: any, ...optionalParams: unknown[]) {
    let stack: string | undefined;
    let params = optionalParams;
    if (
      optionalParams.length >= 1 &&
      typeof optionalParams[0] === "string" &&
      optionalParams[0].includes("\n") &&
      (optionalParams.length === 1 || typeof optionalParams[1] === "string")
    ) {
      stack = optionalParams[0];
      params = optionalParams.slice(1);
    }
    const { context, extra } = splitNestArgs(params);
    const payload = toPayload(context, extra);
    if (stack) payload.stack = stack;
    this.pino.error(payload, message);
  }

  warn(message: any, ...optionalParams: unknown[]) {
    const { context, extra } = splitNestArgs(optionalParams);
    this.pino.warn(toPayload(context, extra), message);
  }

  debug?(message: any, ...optionalParams: unknown[]) {
    const { context, extra } = splitNestArgs(optionalParams);
    this.pino.debug(toPayload(context, extra), message);
  }

  verbose?(message: any, ...optionalParams: unknown[]) {
    const { context, extra } = splitNestArgs(optionalParams);
    this.pino.trace(toPayload(context, extra), message);
  }
}
