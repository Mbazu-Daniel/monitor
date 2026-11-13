import { render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionUser } from "@/types";
import { useAppStore } from "@/stores/app-store";
import { OrgGate } from "./$orgSlug";
import { useFetch } from "@/hooks/use-fetch";

const { api } = vi.hoisted(() => ({ api: vi.fn() }));

vi.mock("@/lib/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/client")>();
  return { ...actual, api };
});
vi.mock("@/hooks/use-fetch", () => ({ useFetch: vi.fn() }));
vi.mock("@/lib/use-ensure-session", () => ({ useEnsureSession: vi.fn() }));
vi.mock("@/components/layout/app-shell", () => ({ AppShell: ({ children }: { children?: ReactNode }) => <>{children}</> }));
vi.mock("@/components/layout/splash", () => ({ Splash: () => "SPLASH" }));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (cfg: object) => ({ ...cfg, useParams: () => ({ orgSlug: "miva" }) }),
  Outlet: () => "OUTLET",
  Navigate: ({ to }: { to: string }) => `NAVIGATE:${to}`,
  useNavigate: () => vi.fn(),
}));

const mockedFetch = useFetch as unknown as ReturnType<typeof vi.fn>;

const meUser: SessionUser = {
  id: "u1",
  name: "Ada Staff",
  email: "ada@miva.edu",
  role: "STAFF",
  organizationSlug: "miva",
  organizationCode: "MOU",
  organizationName: "MIVA Open University",
  createdAt: "2026-11-01T00:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  useAppStore.setState({ user: null, authChecked: true });
  mockedFetch.mockReturnValue({ data: { organizations: [] }, error: null, loading: false, refetch: vi.fn() });
});

describe("OrgGate", () => {
  it("redirects signed-out visitors home", () => {
    useAppStore.setState({ user: null, authChecked: true });
    render(<OrgGate />);
    expect(screen.getByText("NAVIGATE:/")).toBeInTheDocument();
  });

  it("renders the app outlet when the user is on their own campus", () => {
    useAppStore.setState({ user: meUser, authChecked: true });
    render(<OrgGate />);
    expect(screen.getByText("OUTLET")).toBeInTheDocument();
  });

  it("shows the no-campus message for a campus the user does not belong to", () => {
    useAppStore.setState({ user: { ...meUser, organizationSlug: "other" }, authChecked: true });
    render(<OrgGate />);
    expect(screen.getByText("No campus at that link")).toBeInTheDocument();
    expect(api).not.toHaveBeenCalled();
  });

  it("switches to a campus the user belongs to", async () => {
    useAppStore.setState({ user: { ...meUser, organizationSlug: "other" }, authChecked: true });
    mockedFetch.mockReturnValue({
      data: { organizations: [{ id: "org-1", name: "MIVA Open University", slug: "miva", role: "STAFF" }] },
      error: null,
      loading: false,
      refetch: vi.fn(),
    });
    api.mockResolvedValueOnce({}).mockResolvedValueOnce({ user: meUser });
    render(<OrgGate />);
    await waitFor(() => {
      expect(api).toHaveBeenCalledWith("/api/auth/organization/set-active", expect.objectContaining({ method: "POST" }));
    });
  });
});
