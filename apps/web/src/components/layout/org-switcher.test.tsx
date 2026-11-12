import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionUser } from "@/types";
import { useAppStore } from "@/stores/app-store";
import { OrgSwitcher } from "./org-switcher";
import { useFetch } from "@/hooks/use-fetch";

vi.mock("@/hooks/use-fetch", () => ({ useFetch: vi.fn() }));

const mockNavigate = vi.fn();
vi.mock("@tanstack/react-router", () => ({ useNavigate: () => mockNavigate }));

const { api } = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock("@/lib/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/client")>();
  return { ...actual, api };
});

const adminUser: SessionUser = {
  id: "u1",
  name: "Ada Admin",
  email: "ada@miva.edu",
  role: "ADMIN",
  organizationId: "org-1",
  organizationSlug: "miva-open-university",
  organizationCode: "MOU",
  organizationName: "MIVA Open University",
  createdAt: "2026-11-01T00:00:00.000Z",
};

const orgs = [
  { id: "org-1", name: "MIVA Open University", slug: "miva-open-university", role: "ADMIN" },
  { id: "org-2", name: "Lagos Polytechnic", slug: "lagos-poly", role: "STAFF" },
];

const mockedFetch = useFetch as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  useAppStore.setState({ user: adminUser });
  mockedFetch.mockReturnValue({ data: { organizations: orgs }, error: null, loading: false, refetch: vi.fn() });
});

describe("OrgSwitcher", () => {
  it("renders the current campus", () => {
    render(<OrgSwitcher />);
    expect(screen.getByText("MIVA Open University")).toBeInTheDocument();
  });

  it("switches campus and navigates to the new slug", async () => {
    api.mockResolvedValueOnce({}).mockResolvedValueOnce({
      user: { ...adminUser, organizationId: "org-2", organizationSlug: "lagos-poly", organizationName: "Lagos Polytechnic" },
    });
    render(<OrgSwitcher />);
    fireEvent.click(screen.getByRole("button", { name: /switch campus/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: /lagos polytechnic/i }));
    await waitFor(() => {
      expect(api).toHaveBeenNthCalledWith(1, "/api/auth/organization/set-active", expect.objectContaining({ method: "POST" }));
    });
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith({ to: "/$orgSlug", params: { orgSlug: "lagos-poly" }, replace: true }));
  });

  it("routes to onboarding from the create campus item", () => {
    render(<OrgSwitcher />);
    fireEvent.click(screen.getByRole("button", { name: /switch campus/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: /create campus/i }));
    expect(mockNavigate).toHaveBeenCalledWith({ to: "/onboarding" });
  });
});
