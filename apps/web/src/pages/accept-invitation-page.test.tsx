import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionUser } from "@/types";
import { useAppStore } from "@/stores/app-store";
import { AcceptInvitationPage } from "./accept-invitation-page";
import { ApiError } from "@/lib/client";

const { api } = vi.hoisted(() => ({ api: vi.fn() }));

vi.mock("@/lib/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/client")>();
  return { ...actual, api };
});

const mockNavigate = vi.fn();
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
  useSearch: () => ({ id: "inv-1" }),
}));

vi.mock("@/components/auth/auth-forms", () => ({
  LoginForm: ({ onAuthed }: { onAuthed: (u: SessionUser) => void }) => (
    <button onClick={() => onAuthed({ ...adminUser, name: "Grace" })}>Sign in as Grace</button>
  ),
  CreateAccountForm: () => <div>CREATE ACCOUNT</div>,
}));

const adminUser: SessionUser = {
  id: "u1",
  name: "Ada Admin",
  email: "ada@miva.edu",
  role: "ADMIN",
  organizationSlug: "miva",
  organizationCode: "MOU",
  organizationName: "MIVA Open University",
  createdAt: "2026-11-01T00:00:00.000Z",
};

const invitation = {
  id: "inv-1",
  email: "grace@miva.edu",
  role: "STAFF",
  status: "pending",
  expiresAt: "2026-12-01T00:00:00.000Z",
  organizationName: "MIVA Open University",
  organizationSlug: "miva",
  inviterEmail: "admin@miva.edu",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockNavigate.mockReset();
  useAppStore.setState({ user: null, authChecked: true });
  api.mockReset();
});

function mockApiRoutes(routes: Record<string, () => unknown>) {
  api.mockImplementation(async (path: string) => {
    const handler = routes[path];
    if (handler) return handler();
    throw new ApiError(`no mock for ${path}`, 500);
  });
}

describe("AcceptInvitationPage", () => {
  it("shows the invitation when signed in as the invitee", async () => {
    useAppStore.setState({ user: adminUser, authChecked: true });
    mockApiRoutes({
      "/api/auth/organization/get-invitation?id=inv-1": () => invitation,
    });
    render(<AcceptInvitationPage />);
    expect(await screen.findByText("MIVA Open University")).toBeInTheDocument();
    expect(screen.getByText(/invited you to join as STAFF/i)).toBeInTheDocument();
  });

  it("shows the sign-in prompt when signed out", () => {
    useAppStore.setState({ user: null, authChecked: true });
    render(<AcceptInvitationPage />);
    expect(screen.getByText("Sign in as Grace")).toBeInTheDocument();
  });

  it("maps a recipient mismatch to the friendly mismatch message", async () => {
    useAppStore.setState({ user: adminUser, authChecked: true });
    api.mockRejectedValue(new ApiError("This invitation is for a different recipient", 400));
    render(<AcceptInvitationPage />);
    expect(await screen.findByText(/sent to a different email address/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign out and use the invited email/i })).toBeInTheDocument();
  });

  it("maps an expired invitation to the invalid message", async () => {
    useAppStore.setState({ user: adminUser, authChecked: true });
    api.mockRejectedValue(new ApiError("Invitation expired or not found", 404));
    render(<AcceptInvitationPage />);
    expect(await screen.findByText(/no longer valid/i)).toBeInTheDocument();
  });

  it("accepts the invitation and navigates home", async () => {
    useAppStore.setState({ user: adminUser, authChecked: true });
    const post = vi.fn().mockResolvedValue({});
    mockApiRoutes({
      "/api/auth/organization/get-invitation?id=inv-1": () => invitation,
      "/api/auth/organization/accept-invitation": post,
      "/api/me": () => ({ user: adminUser }),
    });
    render(<AcceptInvitationPage />);
    const acceptButton = await screen.findByRole("button", { name: /accept invitation/i });
    fireEvent.click(acceptButton);
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith({ to: "/" }));
    expect(post).toHaveBeenCalled();
  });
});
