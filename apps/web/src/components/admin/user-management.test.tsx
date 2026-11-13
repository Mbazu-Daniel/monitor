import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import { UserManagement } from "./user-management";
import { useFetch } from "@/hooks/use-fetch";
import { useAppStore } from "@/stores/app-store";
import type { UserRow } from "@/types";

const { api } = vi.hoisted(() => ({ api: vi.fn() }));

vi.mock("@/lib/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/client")>();
  return { ...actual, api };
});
vi.mock("@/hooks/use-fetch", () => ({ useFetch: vi.fn() }));

const mockedFetch = useFetch as unknown as Mock;

const staffRow: UserRow = {
  id: "u1",
  name: "Ada Staff",
  email: "ada@miva.edu",
  role: "STAFF",
  department: "Registry",
  phone: null,
  matricNo: null,
  isActive: true,
  createdAt: "2026-11-12T00:00:00.000Z",
  _count: { requests: 2, assignments: 0 },
};

const studentRow: UserRow = {
  id: "u2",
  name: "Sunny Student",
  email: "sunny@miva.edu",
  role: "STUDENT",
  department: null,
  phone: null,
  matricNo: "S0001",
  isActive: true,
  createdAt: "2026-11-12T00:00:00.000Z",
  _count: { requests: 4, assignments: 0 },
};

function page(items: UserRow[]) {
  return { items, total: items.length, page: 1, pageSize: 8, totalPages: 1 };
}

beforeEach(() => {
  vi.clearAllMocks();
  useAppStore.setState({ user: null });
  mockedFetch.mockReturnValue({ data: page([staffRow]), error: null, loading: false, refetch: vi.fn() });
});

describe("UserManagement (all)", () => {
  it("renders the header, a user row and the role select", () => {
    render(<UserManagement scope="all" />);
    expect(screen.getByRole("heading", { name: "Manage Users" })).toBeInTheDocument();
    expect(screen.getByText("Ada Staff")).toBeInTheDocument();
    expect(screen.getByLabelText("Change role for Ada Staff")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
  });

  it("blocks submit until the form is valid", async () => {
    const user = userEvent.setup({ delay: null });
    render(<UserManagement scope="all" />);
    await user.click(screen.getByRole("button", { name: /add user/i }));
    await user.type(screen.getByLabelText("Full name"), "Bo");
    await user.type(screen.getByLabelText("Email"), "not-an-email");
    await user.type(screen.getByLabelText("Temporary password"), "secret123");
    await user.click(screen.getByRole("button", { name: /create user/i }));
    expect(await screen.findByText("A valid email is required")).toBeInTheDocument();
    expect(api).not.toHaveBeenCalled();
  });

  it("creates a user and refreshes", async () => {
    api.mockResolvedValueOnce({});
    const user = userEvent.setup({ delay: null });
    render(<UserManagement scope="all" />);
    await user.click(screen.getByRole("button", { name: /add user/i }));
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText("Full name"), "Grace Officer");
    await user.type(within(dialog).getByLabelText("Email"), "grace@miva.edu");
    await user.type(within(dialog).getByLabelText("Temporary password"), "secret123");
    await user.click(within(dialog).getByRole("button", { name: /create user/i }));
    expect(api).toHaveBeenCalledWith(
      "/api/users",
      expect.objectContaining({ method: "POST" }),
    );
    const body = JSON.parse((api.mock.calls[0][1] as { body: string }).body);
    expect(body).toMatchObject({ name: "Grace Officer", email: "grace@miva.edu", role: "STAFF" });
  });
});

describe("UserManagement (students)", () => {
  beforeEach(() => {
    mockedFetch.mockReturnValue({ data: page([studentRow]), error: null, loading: false, refetch: vi.fn() });
  });

  it("renders the students header, an edit button and no role select", () => {
    render(<UserManagement scope="students" />);
    expect(screen.getByRole("heading", { name: "Students" })).toBeInTheDocument();
    expect(screen.getByText("Sunny Student")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /edit/i })).toBeInTheDocument();
    expect(screen.queryByLabelText("Change role for Sunny Student")).not.toBeInTheDocument();
  });

  it("creates the account with the STUDENT role", async () => {
    api.mockResolvedValueOnce({});
    const user = userEvent.setup({ delay: null });
    render(<UserManagement scope="students" />);
    await user.click(screen.getByRole("button", { name: /add student/i }));
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText("Full name"), "New Student");
    await user.type(within(dialog).getByLabelText("Email"), "new@miva.edu");
    await user.type(within(dialog).getByLabelText("Temporary password"), "secret123");
    await user.click(within(dialog).getByRole("button", { name: /add student/i }));
    expect(api).toHaveBeenCalledWith(
      "/api/users",
      expect.objectContaining({ method: "POST" }),
    );
    const body = JSON.parse((api.mock.calls[0][1] as { body: string }).body);
    expect(body).toMatchObject({ name: "New Student", role: "STUDENT" });
  });

  it("shows the error state with a retry action", () => {
    mockedFetch.mockReturnValue({ data: null, error: "boom", loading: false, refetch: vi.fn() });
    render(<UserManagement scope="students" />);
    expect(screen.getByText("Could not load students")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });
});
