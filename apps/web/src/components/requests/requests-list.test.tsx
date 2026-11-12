import { render, screen, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import type { ServiceRequestRow } from "@/types";
import { RequestsListView } from "./requests-list";
import { useFetch } from "@/hooks/use-fetch";
import { useAppStore } from "@/stores/app-store";

vi.mock("@/hooks/use-fetch", () => ({ useFetch: vi.fn() }));
vi.mock("@/hooks/use-campus-events", () => ({ useCampusEvents: vi.fn() }));

const mockNavigate = vi.fn();
vi.mock("@/lib/view-nav", () => ({ useViewNav: () => mockNavigate }));

let searchParams: Record<string, string | number | undefined> = {};

vi.mock("@tanstack/react-router", () => ({
  getRouteApi: () => ({ useSearch: () => searchParams }),
  useNavigate: () => vi.fn(),
}));

const mockedFetch = useFetch as unknown as Mock;

const ada = {
  id: "u1",
  name: "Ada Staff",
  email: "ada@miva.edu",
  role: "OFFICER" as const,
  createdAt: "2026-11-01T00:00:00.000Z",
};

const request: ServiceRequestRow = {
  id: "req-1",
  reference: "SR-24",
  title: "Leaking pipe in Block D",
  description: "Water leaks from the ceiling every rain.",
  location: "Faculty of Arts, Block D",
  priority: "HIGH",
  status: "ASSIGNED",
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-02T00:00:00.000Z",
  category: { id: "cat-1", name: "Plumbing & Water", description: "", icon: "Droplets" },
  creator: { id: "u9", name: "Sunny Student", email: "sunny@miva.edu", department: null, matricNo: "S0001" },
  attachments: [],
  _count: { comments: 2 },
};

const page = (items: ServiceRequestRow[], total = items.length) => ({
  items,
  total,
  page: 1,
  pageSize: 8,
  totalPages: 1,
});

beforeEach(() => {
  vi.clearAllMocks();
  searchParams = {};
  useAppStore.setState({ user: ada });
  mockedFetch.mockImplementation((url: string) => {
    if (url.startsWith("/api/categories")) {
      return { data: { categories: [] }, error: null, loading: false, refetch: vi.fn() };
    }
    return { data: page([request]), error: null, loading: false, refetch: vi.fn() };
  });
});

describe("RequestsListView", () => {
  it("renders the fetched requests in the desktop table", () => {
    render(<RequestsListView />);
    expect(screen.getAllByText("SR-24").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Leaking pipe in Block D").length).toBeGreaterThan(0);
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("navigates to the request detail when a row is activated", () => {
    render(<RequestsListView />);
    fireEvent.click(screen.getByRole("button", { name: /open request sr-24/i }));
    expect(mockNavigate).toHaveBeenCalledWith("request-detail", "SR-24");
  });

  it("shows the empty state when there are no requests", () => {
    mockedFetch.mockImplementation((url: string) => {
      if (url.startsWith("/api/categories")) {
        return { data: { categories: [] }, error: null, loading: false, refetch: vi.fn() };
      }
      return { data: page([], 0), error: null, loading: false, refetch: vi.fn() };
    });
    render(<RequestsListView />);
    expect(screen.getByText("No requests yet")).toBeInTheDocument();
  });

  it("shows the matching empty state when filters are active", () => {
    searchParams = { status: "OPEN" };
    mockedFetch.mockImplementation((url: string) => {
      if (url.startsWith("/api/categories")) {
        return { data: { categories: [] }, error: null, loading: false, refetch: vi.fn() };
      }
      return { data: page([], 0), error: null, loading: false, refetch: vi.fn() };
    });
    render(<RequestsListView />);
    expect(screen.getByText("No matching requests")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reset filters/i })).toBeInTheDocument();
  });

  it("requests the page the user navigates to", () => {
    searchParams = { page: 2 };
    render(<RequestsListView />);
    expect(mockedFetch).toHaveBeenCalledWith(expect.stringContaining("/api/requests?"));
    expect(mockedFetch).toHaveBeenCalledWith(expect.stringContaining("page=2"));
  });
});
