import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PageHeader } from "./page-header";

describe("PageHeader", () => {
  it("renders the title as a heading", () => {
    render(<PageHeader title="Requests" />);
    expect(screen.getByRole("heading", { name: "Requests" })).toBeInTheDocument();
  });

  it("renders the description when provided", () => {
    render(<PageHeader title="Requests" description="Everything you reported." />);
    expect(screen.getByText("Everything you reported.")).toBeInTheDocument();
  });

  it("omits the description when not provided", () => {
    const { container } = render(<PageHeader title="Requests" />);
    expect(container.querySelector("p")).not.toBeInTheDocument();
  });

  it("renders action children", () => {
    render(
      <PageHeader title="Requests">
        <button type="button">Export</button>
      </PageHeader>,
    );
    expect(screen.getByRole("button", { name: "Export" })).toBeInTheDocument();
  });
});
