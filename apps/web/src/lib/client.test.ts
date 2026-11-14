import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, api, qs } from "./client";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

function jsonResponse(status: number, body: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("qs", () => {
  it("builds a query string from set values", () => {
    expect(qs({ status: "OPEN", page: 2 })).toBe("?status=OPEN&page=2");
  });

  it("skips undefined, null and empty values", () => {
    expect(qs({ a: undefined, b: null, c: "", d: "x" })).toBe("?d=x");
  });

  it("returns an empty string when nothing is set", () => {
    expect(qs({})).toBe("");
  });
});

describe("api", () => {
  it("returns the response data", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { ok: true }));
    await expect(api("/api/health")).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/health",
      expect.objectContaining({ method: "GET", credentials: "include" }),
    );
  });

  it("posts JSON with an application/json content type", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, {}));
    await api("/api/requests", { method: "POST", body: JSON.stringify({ title: "x" }) });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/requests",
      expect.objectContaining({
        headers: expect.objectContaining({ "Content-Type": "application/json" }),
      }),
    );
  });

  it("maps error responses with joined field messages to ApiError", async () => {
    fetchMock.mockResolvedValue(jsonResponse(400, { message: ["Title too short", "Location required"] }));
    await expect(api("/api/requests", { method: "POST" })).rejects.toMatchObject({
      message: "Title too short, Location required",
      status: 400,
    });
  });

  it("maps error responses with a string error field to ApiError", async () => {
    fetchMock.mockResolvedValue(jsonResponse(403, { error: "Forbidden" }));
    await expect(api("/api/users")).rejects.toMatchObject({ message: "Forbidden", status: 403 });
  });

  it("maps error responses without a JSON body to ApiError", async () => {
    fetchMock.mockResolvedValue(new Response("upstream broke", { status: 502 }));
    await expect(api("/api/health")).rejects.toMatchObject({ status: 502 });
  });

  it("maps network failures to ApiError", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(api("/api/health")).rejects.toMatchObject({ status: 0 });
    await expect(api("/api/health")).rejects.toBeInstanceOf(ApiError);
  });

  it("returns undefined for 204 responses", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await expect(api("/api/requests/1", { method: "DELETE" })).resolves.toBeUndefined();
  });
});
