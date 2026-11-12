import { describe, expect, it } from "vitest";
import { viewFromPath, viewPath } from "./view-nav";

describe("viewPath", () => {
  it("maps the dashboard to the org root", () => {
    expect(viewPath("miva", "dashboard")).toEqual({ to: "/$orgSlug", params: { orgSlug: "miva" } });
  });

  it("maps simple views to their routes", () => {
    expect(viewPath("miva", "board")).toEqual({ to: "/$orgSlug/board", params: { orgSlug: "miva" } });
    expect(viewPath("miva", "requests")).toEqual({ to: "/$orgSlug/requests", params: { orgSlug: "miva" } });
    expect(viewPath("miva", "new-request")).toEqual({ to: "/$orgSlug/requests/new", params: { orgSlug: "miva" } });
    expect(viewPath("miva", "users")).toEqual({ to: "/$orgSlug/users", params: { orgSlug: "miva" } });
    expect(viewPath("miva", "students")).toEqual({ to: "/$orgSlug/students", params: { orgSlug: "miva" } });
    expect(viewPath("miva", "categories")).toEqual({ to: "/$orgSlug/categories", params: { orgSlug: "miva" } });
    expect(viewPath("miva", "reports")).toEqual({ to: "/$orgSlug/reports", params: { orgSlug: "miva" } });
    expect(viewPath("miva", "audit")).toEqual({ to: "/$orgSlug/audit", params: { orgSlug: "miva" } });
    expect(viewPath("miva", "settings")).toEqual({ to: "/$orgSlug/settings", params: { orgSlug: "miva" } });
  });

  it("passes the reference through for request-detail", () => {
    expect(viewPath("miva", "request-detail", "SR-42")).toEqual({ to: "/$orgSlug/requests/$reference", params: { orgSlug: "miva", reference: "SR-42" } });
  });

  it("defaults a missing reference to an empty string", () => {
    expect(viewPath("miva", "request-detail")).toEqual({ to: "/$orgSlug/requests/$reference", params: { orgSlug: "miva", reference: "" } });
  });
});

describe("viewFromPath", () => {
  it("maps the org root to the dashboard", () => {
    expect(viewFromPath("/miva", "miva")).toBe("dashboard");
    expect(viewFromPath("/miva/", "miva")).toBe("dashboard");
  });

  it("returns null for other orgs", () => {
    expect(viewFromPath("/other/board", "miva")).toBeNull();
  });

  it("maps every view route", () => {
    expect(viewFromPath("/miva/board", "miva")).toBe("board");
    expect(viewFromPath("/miva/requests", "miva")).toBe("requests");
    expect(viewFromPath("/miva/requests/new", "miva")).toBe("new-request");
    expect(viewFromPath("/miva/requests/SR-42", "miva")).toBe("request-detail");
    expect(viewFromPath("/miva/users", "miva")).toBe("users");
    expect(viewFromPath("/miva/students", "miva")).toBe("students");
    expect(viewFromPath("/miva/categories", "miva")).toBe("categories");
    expect(viewFromPath("/miva/reports", "miva")).toBe("reports");
    expect(viewFromPath("/miva/audit", "miva")).toBe("audit");
    expect(viewFromPath("/miva/settings", "miva")).toBe("settings");
  });

  it("ignores trailing slashes", () => {
    expect(viewFromPath("/miva/board/", "miva")).toBe("board");
  });

  it("returns null for unknown routes", () => {
    expect(viewFromPath("/miva/unknown", "miva")).toBeNull();
  });
});
