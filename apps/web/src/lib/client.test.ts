import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, api, qs } from "./client";

const { request, isAxiosError } = vi.hoisted(() => ({
  request: vi.fn(),
  isAxiosError: vi.fn(),
}));

vi.mock("axios", () => ({
  default: { request, isAxiosError, get: vi.fn() },
}));

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
    request.mockResolvedValue({ data: { ok: true } });
    await expect(api("/api/health")).resolves.toEqual({ ok: true });
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({ url: "/api/health", method: "GET", withCredentials: true }),
    );
  });

  it("posts JSON with an application/json content type", async () => {
    request.mockResolvedValue({ data: {} });
    await api("/api/requests", { method: "POST", body: JSON.stringify({ title: "x" }) });
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: expect.objectContaining({ "Content-Type": "application/json" }),
      }),
    );
  });

  it("maps axios errors with joined field messages to ApiError", async () => {
    isAxiosError.mockReturnValue(true);
    request.mockRejectedValue({
      response: { status: 400, data: { message: ["Title too short", "Location required"] } },
    });
    await expect(api("/api/requests", { method: "POST" })).rejects.toBeInstanceOf(ApiError);
    await expect(api("/api/requests", { method: "POST" })).rejects.toMatchObject({
      message: "Title too short, Location required",
      status: 400,
    });
  });

  it("maps axios errors with a string error field to ApiError", async () => {
    isAxiosError.mockReturnValue(true);
    request.mockRejectedValue({ response: { status: 403, data: { error: "Forbidden" } } });
    await expect(api("/api/users")).rejects.toMatchObject({ message: "Forbidden", status: 403 });
  });

  it("maps axios errors without a response body to ApiError", async () => {
    isAxiosError.mockReturnValue(true);
    request.mockRejectedValue(new Error("Network Error"));
    await expect(api("/api/health")).rejects.toBeInstanceOf(ApiError);
  });

  it("rethrows non-axios errors untouched", async () => {
    isAxiosError.mockReturnValue(false);
    const boom = new Error("boom");
    request.mockRejectedValue(boom);
    await expect(api("/api/health")).rejects.toBe(boom);
  });
});
