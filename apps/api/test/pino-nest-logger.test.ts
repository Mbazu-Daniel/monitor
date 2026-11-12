import { describe, expect, it } from "vitest";
import type { Logger } from "pino";
import { PinoNestLogger } from "../src/common/pino-nest-logger.ts";

function capture() {
  const lines: { level: string; payload: Record<string, unknown>; message: unknown }[] = [];
  const pino = {
    info: (payload: Record<string, unknown>, message: unknown) => lines.push({ level: "info", payload, message }),
    warn: (payload: Record<string, unknown>, message: unknown) => lines.push({ level: "warn", payload, message }),
    error: (payload: Record<string, unknown>, message: unknown) => lines.push({ level: "error", payload, message }),
    debug: (payload: Record<string, unknown>, message: unknown) => lines.push({ level: "debug", payload, message }),
    trace: (payload: Record<string, unknown>, message: unknown) => lines.push({ level: "trace", payload, message }),
  };
  return { lines, logger: new PinoNestLogger(pino as unknown as Logger) };
}

describe("PinoNestLogger", () => {
  it("logs the message with an empty payload", () => {
    const { lines, logger } = capture();
    logger.log("hello");
    expect(lines[0]).toEqual({ level: "info", payload: {}, message: "hello" });
  });

  it("attaches a string context", () => {
    const { lines, logger } = capture();
    logger.log("hello", "my-context");
    expect(lines[0]?.payload).toEqual({ context: "my-context" });
  });

  it("attaches an Error as err", () => {
    const { lines, logger } = capture();
    const err = new Error("boom");
    logger.log("failed", err);
    expect(lines[0]?.payload).toEqual({ err });
  });

  it("merges a plain object extra", () => {
    const { lines, logger } = capture();
    logger.log("hello", { requestId: "req-1", status: 200 });
    expect(lines[0]?.payload).toEqual({ requestId: "req-1", status: 200 });
  });

  it("keeps the context when merging a plain object extra", () => {
    const { lines, logger } = capture();
    logger.log("hello", { requestId: "req-1" }, "my-context");
    expect(lines[0]?.payload).toEqual({ requestId: "req-1", context: "my-context" });
  });

  it("wraps a non-object extra in .extra", () => {
    const { lines, logger } = capture();
    logger.log("hello", 42);
    expect(lines[0]?.payload).toEqual({ extra: 42 });
  });

  it("detects a stack string as the first argument of error()", () => {
    const { lines, logger } = capture();
    logger.error("failed", "Error: boom\n    at thing (file.ts:1:1)");
    expect(lines[0]?.payload).toEqual({ stack: "Error: boom\n    at thing (file.ts:1:1)" });
  });

  it("attaches context and extra to errors with a stack string", () => {
    const { lines, logger } = capture();
    logger.error("failed", "stack\nline", "my-context");
    expect(lines[0]?.payload).toEqual({ context: "my-context", stack: "stack\nline" });
  });

  it("routes verbose to trace and warn to warn", () => {
    const { lines, logger } = capture();
    logger.verbose?.("v");
    logger.warn("w");
    logger.debug?.("d");
    expect(lines.map((l) => l.level)).toEqual(["trace", "warn", "debug"]);
  });
});
