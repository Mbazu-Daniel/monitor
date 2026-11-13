import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useEnsureSession } from "./use-ensure-session";
import { useAppStore } from "@/stores/app-store";

const { api } = vi.hoisted(() => ({ api: vi.fn() }));

vi.mock("@/lib/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/client")>();
  return { ...actual, api };
});

beforeEach(() => {
  vi.clearAllMocks();
  useAppStore.setState({ user: null, authChecked: false });
});

describe("useEnsureSession", () => {
  it("fetches the session and marks auth as checked", async () => {
    const user = {
      id: "u1",
      name: "Ada",
      email: "ada@miva.edu",
      role: "STAFF" as const,
      createdAt: "2026-11-01T00:00:00.000Z",
    };
    api.mockResolvedValue({ user });
    renderHook(() => useEnsureSession());
    await waitFor(() => expect(useAppStore.getState().authChecked).toBe(true));
    expect(useAppStore.getState().user?.email).toBe("ada@miva.edu");
    expect(api).toHaveBeenCalledWith("/api/me");
  });

  it("marks auth as checked even when the fetch fails", async () => {
    api.mockRejectedValue(new Error("network"));
    renderHook(() => useEnsureSession());
    await waitFor(() => expect(useAppStore.getState().authChecked).toBe(true));
    expect(useAppStore.getState().user).toBeNull();
  });

  it("does not refetch when the session was already checked", async () => {
    useAppStore.setState({ authChecked: true });
    renderHook(() => useEnsureSession());
    expect(api).not.toHaveBeenCalled();
  });
});
