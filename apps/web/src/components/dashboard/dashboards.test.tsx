import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import type { SessionUser } from "@/types";
import { useFetch } from "@/hooks/use-fetch";
import { useAppStore } from "@/stores/app-store";
import { DashboardView } from "./dashboards";

vi.mock("@/hooks/use-fetch", () => ({ useFetch: vi.fn() }));
vi.mock("@/lib/view-nav", () => ({ useViewNav: () => vi.fn() }));

const mockedFetch = useFetch as unknown as Mock;

function makeUser(role: SessionUser["role"]): SessionUser {
  return {
    id: "u1",
    name: "Ada Staff",
    email: "ada@miva.edu",
    role,
    createdAt: "2026-11-12T00:00:00.000Z",
  };
}

const personalStats = {
  total: 3,
  open: 2,
  inProgress: 1,
  resolved: 1,
  recent: [],
};

beforeEach(() => {
  useAppStore.setState({ user: null });
  vi.clearAllMocks();
  mockedFetch.mockReturnValue({ data: null, error: null, loading: false, refetch: vi.fn() });
});

describe("DashboardView", () => {
  it("renders nothing when there is no session user", () => {
    const { container } = render(<DashboardView />);
    expect(container).toBeEmptyDOMElement();
  });

  it("routes a STAFF user to the personal dashboard", () => {
    useAppStore.setState({ user: makeUser("STAFF") });
    render(<DashboardView />);
    expect(screen.getByRole("heading", { name: "Overview" })).toBeInTheDocument();
    expect(screen.getByText("My requests")).toBeInTheDocument();
  });

  it("routes an OFFICER user to the officer overview", () => {
    useAppStore.setState({ user: makeUser("OFFICER") });
    render(<DashboardView />);
    expect(screen.getByRole("heading", { name: "Overview" })).toBeInTheDocument();
  });

  it("routes an ADMIN user to the campus overview", () => {
    useAppStore.setState({ user: makeUser("ADMIN") });
    render(<DashboardView />);
    expect(screen.getByRole("heading", { name: "Campus" })).toBeInTheDocument();
  });

  it("renders the personal stats when they load", () => {
    mockedFetch.mockReturnValue({ data: personalStats, error: null, loading: false, refetch: vi.fn() });
    useAppStore.setState({ user: makeUser("STAFF") });
    render(<DashboardView />);
    expect(screen.getByText("You have 2 open requests.")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("shows the empty state when the staff user has no requests", () => {
    mockedFetch.mockReturnValue({ data: personalStats, error: null, loading: false, refetch: vi.fn() });
    useAppStore.setState({ user: makeUser("STAFF") });
    render(<DashboardView />);
    expect(screen.getByText("No requests yet")).toBeInTheDocument();
  });
});
