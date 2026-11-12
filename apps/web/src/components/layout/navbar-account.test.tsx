import { render, screen, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionUser } from "@/types";
import { useAppStore } from "@/stores/app-store";
import { NavbarAccount } from "./navbar-account";

vi.mock("@/lib/view-nav", () => ({ useViewNav: () => vi.fn() }));
vi.mock("@/lib/client", () => ({ api: vi.fn() }));

function makeUser(role: SessionUser["role"]): SessionUser {
  return {
    id: "u1",
    name: "Ada Admin",
    email: "ada@miva.edu",
    role,
    organizationCode: "miva-open-university",
    organizationName: "MIVA Open University",
    createdAt: "2026-11-01T00:00:00.000Z",
  };
}

beforeEach(() => useAppStore.setState({ user: null }));

describe("NavbarAccount", () => {
  it("shows the member name and opens the account menu with Settings and Sign out", () => {
    useAppStore.setState({ user: makeUser("ADMIN") });
    render(<NavbarAccount />);
    expect(screen.getByText("Ada Admin")).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: /settings/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /account menu for Ada Admin/i }));
    expect(screen.getByRole("menuitem", { name: /settings/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /sign out/i })).toBeInTheDocument();
  });

  it("renders nothing when signed out", () => {
    const { container } = render(<NavbarAccount />);
    expect(container).toBeEmptyDOMElement();
  });
});
