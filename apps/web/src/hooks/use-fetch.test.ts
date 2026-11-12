import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useFetch } from "./use-fetch";

const { useQuery } = vi.hoisted(() => ({ useQuery: vi.fn() }));

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: unknown) => useQuery(options),
}));

const { api } = vi.hoisted(() => ({ api: vi.fn() }));

vi.mock("@/lib/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/client")>();
  return { ...actual, api };
});

beforeEach(() => {
  vi.clearAllMocks();
  useQuery.mockReturnValue({ data: "rows", error: null, isLoading: false, refetch: vi.fn(async () => "refetched") });
});

describe("useFetch", () => {
  it("passes the url and default deps into the query", () => {
    const { result } = renderHook(() => useFetch("/api/things"));
    expect(useQuery).toHaveBeenCalledWith(expect.objectContaining({
      queryKey: ["/api/things"],
      enabled: true,
      refetchInterval: false,
    }));
    expect(result.current.data).toBe("rows");
    expect(result.current.loading).toBe(false);
  });

  it("includes extra deps and poll settings in the query", () => {
    renderHook(() => useFetch("/api/things", { pollMs: 5000, deps: ["v2", 7] }));
    expect(useQuery).toHaveBeenCalledWith(expect.objectContaining({
      queryKey: ["/api/things", "v2", 7],
      refetchInterval: 5000,
    }));
  });

  it("disables the query when url is null", () => {
    renderHook(() => useFetch(null));
    expect(useQuery).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
  });

  it("surfaces the query error message", () => {
    useQuery.mockReturnValue({ data: null, error: new Error("boom"), isLoading: false, refetch: vi.fn() });
    const { result } = renderHook(() => useFetch("/api/things"));
    expect(result.current.error).toBe("boom");
  });
});
