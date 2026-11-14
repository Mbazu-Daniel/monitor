import { describe, expect, it } from "vitest";
import { csvEscape, parsePagination } from "./pagination.js";

describe("csvEscape", () => {
  it("quotes cells containing commas, quotes and newlines", () => {
    expect(csvEscape('a,b')).toBe('"a,b"');
    expect(csvEscape('say "hi"')).toBe('"say ""hi"""');
    expect(csvEscape("line1\nline2")).toBe('"line1\nline2"');
  });

  it("neutralizes spreadsheet formula prefixes", () => {
    expect(csvEscape("=1+1")).toBe("'=1+1");
    expect(csvEscape("+cmd")).toBe("'+cmd");
    expect(csvEscape("-2+3")).toBe("'-2+3");
    expect(csvEscape("@SUM(1)")).toBe("'@SUM(1)");
    expect(csvEscape("\t=1")).toBe("'\t=1");
  });

  it("passes plain values through unchanged", () => {
    expect(csvEscape("Broken fuse")).toBe("Broken fuse");
    expect(csvEscape(42)).toBe("42");
    expect(csvEscape(null)).toBe("");
    expect(csvEscape(undefined)).toBe("");
  });
});

describe("parsePagination", () => {
  it("caps pageSize at 50 and floors page at 1", () => {
    expect(parsePagination({ page: -3, pageSize: 9999 })).toEqual({ page: 1, pageSize: 50, skip: 0, take: 50 });
    expect(parsePagination({}, 8).take).toBe(8);
  });
});
