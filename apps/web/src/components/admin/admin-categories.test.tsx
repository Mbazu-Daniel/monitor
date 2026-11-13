import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Category } from "@/types";
import { CategoriesView } from "./admin-categories";
import { useFetch } from "@/hooks/use-fetch";

const { api } = vi.hoisted(() => ({ api: vi.fn() }));

vi.mock("@/lib/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/client")>();
  return { ...actual, api };
});
vi.mock("@/hooks/use-fetch", () => ({ useFetch: vi.fn() }));

const mockedFetch = useFetch as unknown as ReturnType<typeof vi.fn>;

const electrical: Category = {
  id: "cat-1",
  name: "Electrical Fault",
  description: "Power outages and faulty sockets.",
  icon: "Zap",
  _count: { requests: 3 },
};

beforeEach(() => {
  vi.clearAllMocks();
  mockedFetch.mockReturnValue({ data: { categories: [electrical] }, error: null, loading: false, refetch: vi.fn() });
});

describe("CategoriesView", () => {
  it("lists the categories it fetches", () => {
    render(<CategoriesView />);
    expect(screen.getByText("Electrical Fault")).toBeInTheDocument();
    expect(screen.getByText("3 request(s)")).toBeInTheDocument();
  });

  it("blocks saving until the name is valid", async () => {
    render(<CategoriesView />);
    fireEvent.click(screen.getByRole("button", { name: /new category/i }));
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "X" } });
    fireEvent.click(screen.getByRole("button", { name: /^create$/i }));
    await waitFor(() => expect(api).not.toHaveBeenCalled());
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("creates a category with a trimmed name", async () => {
    api.mockResolvedValueOnce({});
    render(<CategoriesView />);
    fireEvent.click(screen.getByRole("button", { name: /new category/i }));
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "  Lift & Escalator  " } });
    fireEvent.click(screen.getByRole("button", { name: /^create$/i }));
    await waitFor(() => expect(api).toHaveBeenCalledWith(
      "/api/categories",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ name: "Lift & Escalator", description: "", icon: "Wrench" }),
      }),
    ));
  });

  it("prefills the form when editing an existing category", () => {
    render(<CategoriesView />);
    fireEvent.click(screen.getByRole("button", { name: /edit electrical fault/i }));
    expect(screen.getByLabelText("Name")).toHaveValue("Electrical Fault");
  });

  it("saves edits with PATCH", async () => {
    api.mockResolvedValueOnce({});
    render(<CategoriesView />);
    fireEvent.click(screen.getByRole("button", { name: /edit electrical fault/i }));
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Power & Lighting" } });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
    await waitFor(() => expect(api).toHaveBeenCalledWith(
      "/api/categories/cat-1",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ name: "Power & Lighting", description: "Power outages and faulty sockets.", icon: "Zap" }),
      }),
    ));
  });
});
