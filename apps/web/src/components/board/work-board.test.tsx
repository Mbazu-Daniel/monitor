import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import { useFetch } from "@/hooks/use-fetch";
import { api } from "@/lib/client";
import { useAppStore } from "@/stores/app-store";
import type { SessionUser, ServiceRequestRow } from "@/types";
import { WorkBoardView } from "./work-board";

vi.mock("@/hooks/use-fetch", () => ({ useFetch: vi.fn() }));
vi.mock("@/lib/view-nav", () => ({ useViewNav: () => vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/client")>();
  return { ...actual, api: vi.fn() };
});

const mockedFetch = useFetch as unknown as Mock;
const mockedApi = api as unknown as Mock;

function makeJob(id: string, reference: string, title: string, status: ServiceRequestRow["status"]): ServiceRequestRow {
  return {
    id,
    reference,
    title,
    description: "",
    location: "Block B",
    priority: "HIGH",
    status,
    createdAt: "2026-11-10T10:00:00.000Z",
    updatedAt: "2026-11-11T10:00:00.000Z",
    category: { id: "c1", name: "Electrical", icon: "zap", description: null },
    creator: { id: "u1", name: "Ada Staff", email: "ada@miva.edu", department: null, matricNo: null },
    attachments: [],
  } as unknown as ServiceRequestRow;
}

function mockPage(items: ServiceRequestRow[]) {
  mockedFetch.mockReturnValue({
    data: { items, total: items.length, page: 1, pageSize: 100, totalPages: 1 },
    error: null,
    loading: false,
    refetch: vi.fn().mockResolvedValue(undefined),
  });
}

const jobs = [
  makeJob("j-1", "SR-1", "Fix the lab projector", "ASSIGNED"),
  makeJob("j-2", "SR-2", "Replace broken AC", "IN_PROGRESS"),
];

const officer: SessionUser = {
  id: "u1",
  name: "Officer Ada",
  email: "ada@miva.edu",
  role: "OFFICER",
  createdAt: "2026-11-12T00:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  useAppStore.setState({ user: officer });
  mockPage(jobs);
  mockedApi.mockResolvedValue({ request: { id: "j-1" } });
});

function dataTransfer(id: string) {
  return {
    setData: vi.fn(),
    getData: vi.fn(() => id),
    effectAllowed: "",
    dropEffect: "",
  };
}

describe("WorkBoardView", () => {
  it("renders jobs grouped into their status columns", () => {
    render(<WorkBoardView />);
    expect(within(screen.getByTestId("board-col-ASSIGNED")).getByText("Fix the lab projector")).toBeInTheDocument();
    expect(within(screen.getByTestId("board-col-IN_PROGRESS")).getByText("Replace broken AC")).toBeInTheDocument();
  });

  it("posts the new status and moves the card on a legal drop", async () => {
    render(<WorkBoardView />);
    const card = screen.getByText("Fix the lab projector").closest("article")!;
    const target = screen.getByTestId("board-col-IN_PROGRESS");
    const dt = dataTransfer("j-1");
    fireEvent.dragStart(card, { dataTransfer: dt });
    fireEvent.dragOver(target, { dataTransfer: dt });
    fireEvent.drop(target, { dataTransfer: dt });
    await waitFor(() => expect(mockedApi).toHaveBeenCalledWith("/api/requests/j-1/status", expect.objectContaining({ method: "POST" })));
    const call = mockedApi.mock.calls[0]!;
    expect(JSON.parse(String(call[1].body))).toEqual({ status: "IN_PROGRESS" });
    await waitFor(() => expect(within(screen.getByTestId("board-col-IN_PROGRESS")).getByText("Fix the lab projector")).toBeInTheDocument());
  });

  it("ignores drops into an illegal target column", () => {
    render(<WorkBoardView />);
    const card = screen.getByText("Fix the lab projector").closest("article")!;
    const target = screen.getByTestId("board-col-RESOLVED");
    const dt = dataTransfer("j-1");
    fireEvent.dragStart(card, { dataTransfer: dt });
    fireEvent.drop(target, { dataTransfer: dt });
    expect(mockedApi).not.toHaveBeenCalled();
  });

  it("moves a job via the keyboard-accessible move menu", async () => {
    render(<WorkBoardView />);
    fireEvent.click(screen.getByRole("button", { name: "Move SR-1" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "In progress" }));
    await waitFor(() => expect(mockedApi).toHaveBeenCalledWith("/api/requests/j-1/status", expect.anything()));
    expect(JSON.parse(String(mockedApi.mock.calls[0]![1].body))).toEqual({ status: "IN_PROGRESS" });
  });

  it("shows the empty state when there is nothing assigned", () => {
    mockPage([]);
    render(<WorkBoardView />);
    expect(screen.getByText("No active assignments")).toBeInTheDocument();
  });
});
