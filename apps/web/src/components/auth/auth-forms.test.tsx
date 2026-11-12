import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/client";
import { CreateAccountForm, LoginForm } from "./auth-forms";

const { api } = vi.hoisted(() => ({ api: vi.fn() }));

vi.mock("@/lib/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/client")>();
  return { ...actual, api };
});

const sessionUser = {
  id: "u1",
  name: "Ada Staff",
  email: "ada@miva.edu",
  role: "STAFF" as const,
  createdAt: "2026-11-12T00:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("LoginForm", () => {
  it("requires a valid email", async () => {
    const user = userEvent.setup({ delay: null });
    render(<LoginForm onAuthed={() => {}} />);
    await user.type(screen.getByLabelText("Email"), "not-an-email");
    await user.type(screen.getByLabelText("Password"), "secret123");
    await user.click(screen.getByRole("button", { name: /^sign in$/i }));
    expect(await screen.findByText("Enter a valid email.")).toBeInTheDocument();
    expect(api).not.toHaveBeenCalled();
  });

  it("requires a password", async () => {
    const user = userEvent.setup({ delay: null });
    render(<LoginForm onAuthed={() => {}} />);
    await user.type(screen.getByLabelText("Email"), "ada@miva.edu");
    await user.click(screen.getByRole("button", { name: /^sign in$/i }));
    expect(await screen.findByText("Enter your password.")).toBeInTheDocument();
    expect(api).not.toHaveBeenCalled();
  });

  it("signs in and reports the session user", async () => {
    api.mockResolvedValueOnce({}).mockResolvedValueOnce({ user: sessionUser });
    const onAuthed = vi.fn();
    const user = userEvent.setup({ delay: null });
    render(<LoginForm onAuthed={onAuthed} />);
    await user.type(screen.getByLabelText("Email"), "ada@miva.edu");
    await user.type(screen.getByLabelText("Password"), "secret123");
    await user.click(screen.getByRole("button", { name: /^sign in$/i }));
    expect(onAuthed).toHaveBeenCalledWith(sessionUser);
    expect(api).toHaveBeenNthCalledWith(
      1,
      "/api/auth/sign-in/email",
      expect.objectContaining({ method: "POST" }),
    );
    expect(api).toHaveBeenNthCalledWith(2, "/api/me");
  });

  it("shows the server error message on failure", async () => {
    api.mockRejectedValueOnce(new ApiError("Invalid email or password", 401));
    const user = userEvent.setup({ delay: null });
    render(<LoginForm onAuthed={() => {}} />);
    await user.type(screen.getByLabelText("Email"), "ada@miva.edu");
    await user.type(screen.getByLabelText("Password"), "wrongpass1");
    await user.click(screen.getByRole("button", { name: /^sign in$/i }));
    expect(await screen.findByText("Invalid email or password")).toBeInTheDocument();
  });

  it("switches to the forgot-password view and back", async () => {
    const user = userEvent.setup({ delay: null });
    render(<LoginForm onAuthed={() => {}} />);
    await user.click(screen.getByRole("button", { name: /forgot your password/i }));
    expect(screen.getByText(/send you a reset link/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /back to sign in/i }));
    expect(screen.getByRole("button", { name: /^sign in$/i })).toBeInTheDocument();
  });
});

describe("CreateAccountForm", () => {
  it("requires a valid email", async () => {
    const user = userEvent.setup({ delay: null });
    render(<CreateAccountForm onCreated={() => {}} />);
    await user.type(screen.getByLabelText("Email"), "nope");
    await user.type(screen.getByLabelText("Password"), "password1");
    await user.click(screen.getByRole("button", { name: /create account/i }));
    expect(await screen.findByText("Enter a valid email.")).toBeInTheDocument();
    expect(api).not.toHaveBeenCalled();
  });

  it("rejects a password without a number", async () => {
    const user = userEvent.setup({ delay: null });
    render(<CreateAccountForm onCreated={() => {}} />);
    await user.type(screen.getByLabelText("Email"), "ada@miva.edu");
    await user.type(screen.getByLabelText("Password"), "onlyletters");
    await user.click(screen.getByRole("button", { name: /create account/i }));
    expect(
      await screen.findByText("Password must be at least 8 characters with letters and numbers."),
    ).toBeInTheDocument();
    expect(api).not.toHaveBeenCalled();
  });

  it("creates the account and calls onCreated", async () => {
    api.mockResolvedValueOnce({});
    const onCreated = vi.fn();
    const user = userEvent.setup({ delay: null });
    render(<CreateAccountForm onCreated={onCreated} />);
    await user.type(screen.getByLabelText("Email"), "ada@miva.edu");
    await user.type(screen.getByLabelText("Password"), "password1");
    await user.click(screen.getByRole("button", { name: /create account/i }));
    expect(onCreated).toHaveBeenCalled();
    expect(api).toHaveBeenCalledWith(
      "/api/auth/sign-up/email",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("falls back to sign-in when the email already has an account", async () => {
    api
      .mockRejectedValueOnce(new ApiError("User already exists", 422))
      .mockResolvedValueOnce({});
    const onCreated = vi.fn();
    const user = userEvent.setup({ delay: null });
    render(<CreateAccountForm onCreated={onCreated} />);
    await user.type(screen.getByLabelText("Email"), "ada@miva.edu");
    await user.type(screen.getByLabelText("Password"), "password1");
    await user.click(screen.getByRole("button", { name: /create account/i }));
    expect(api).toHaveBeenNthCalledWith(
      2,
      "/api/auth/sign-in/email",
      expect.objectContaining({ method: "POST" }),
    );
    expect(onCreated).toHaveBeenCalled();
  });

  it("shows a generic error when the fallback sign-in fails", async () => {
    api
      .mockRejectedValueOnce(new ApiError("User already exists", 422))
      .mockRejectedValueOnce(new ApiError("Invalid email or password", 401));
    const user = userEvent.setup({ delay: null });
    render(<CreateAccountForm onCreated={() => {}} />);
    await user.type(screen.getByLabelText("Email"), "ada@miva.edu");
    await user.type(screen.getByLabelText("Password"), "password1");
    await user.click(screen.getByRole("button", { name: /create account/i }));
    expect(
      await screen.findByText("That email already has an account. Sign in instead."),
    ).toBeInTheDocument();
  });
});
