import { render, screen, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionUser } from "@/types";
import { useAppStore } from "@/stores/app-store";
import { SettingsView } from "./settings-view";

vi.mock("@/lib/client", () => ({
  api: vi.fn(async () => ({ user: makeUserSession("ADMIN") })),
  ApiError: class ApiError extends Error {},
}));
vi.mock("@/components/layout/navbar-account", () => ({ NavbarAccount: () => <div data-testid="navbar-account" /> }));

function makeUserSession(role: SessionUser["role"]): SessionUser {
  return {
    id: "u1",
    name: "Ada Admin",
    email: "ada@miva.edu",
    role,
    organizationCode: "miva-open-university",
    organizationName: "MIVA Open University",
    matricNo: "miva-open-university/0001",
    createdAt: "2026-11-01T00:00:00.000Z",
  };
}

beforeEach(() => {
  useAppStore.setState({ user: null });
  vi.clearAllMocks();
});

describe("SettingsView", () => {
  it("renders the profile tab by default with the signed-in user and forms", () => {
    useAppStore.setState({ user: makeUserSession("ADMIN") });
    render(<SettingsView />);
    expect(screen.getByRole("heading", { name: "Settings" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Profile" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByLabelText("Full name")).toHaveValue("Ada Admin");
    expect(screen.getByRole("button", { name: "Save changes" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Update password" })).toBeInTheDocument();
  });

  it("switches to the campus tab and surfaces the campus code with a copy action", async () => {
    useAppStore.setState({ user: makeUserSession("ADMIN") });
    render(<SettingsView />);
    fireEvent.click(screen.getByRole("tab", { name: "Campus" }));
    expect(screen.getByRole("tab", { name: "Campus" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel", { hidden: false })).toHaveTextContent("miva-open-university");
    expect(screen.getByRole("tabpanel", { hidden: false })).toHaveTextContent("MIVA Open University");
    expect(screen.getAllByRole("button", { name: "Copy campus code" }).length).toBeGreaterThan(0);
  });
});
