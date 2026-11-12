import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatDateTime, timeAgo } from "./format";

const NOW = new Date("2026-11-12T12:00:00Z");
const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("timeAgo", () => {
  it("returns just now under a minute", () => {
    expect(timeAgo(new Date(NOW.getTime() - 30 * SECOND))).toBe("just now");
  });

  it("counts minutes", () => {
    expect(timeAgo(new Date(NOW.getTime() - 5 * MINUTE))).toBe("5m ago");
  });

  it("counts hours", () => {
    expect(timeAgo(new Date(NOW.getTime() - 3 * HOUR))).toBe("3h ago");
  });

  it("counts days under a week", () => {
    expect(timeAgo(new Date(NOW.getTime() - 2 * DAY))).toBe("2d ago");
  });

  it("falls back to a date at a week or older", () => {
    const d = new Date(NOW.getTime() - 30 * DAY);
    expect(timeAgo(d)).toBe(
      d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }),
    );
  });

  it("accepts ISO strings", () => {
    expect(timeAgo(new Date(NOW.getTime() - 90 * SECOND).toISOString())).toBe("1m ago");
  });
});

describe("formatDateTime", () => {
  it("renders through the locale date-time format", () => {
    const d = new Date("2026-11-01T08:30:00Z");
    expect(formatDateTime(d)).toBe(
      d.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    );
  });
});
