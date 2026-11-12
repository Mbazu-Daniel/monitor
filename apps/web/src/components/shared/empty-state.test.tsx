import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EmptyState } from "./empty-state";

const Icon = ({ className }: { className?: string }) => <svg data-testid="empty-icon" className={className} />;

describe("EmptyState", () => {
  it("renders the title", () => {
    render(<EmptyState icon={Icon} title="Nothing here" />);
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
  });

  it("renders the icon", () => {
    render(<EmptyState icon={Icon} title="Nothing here" />);
    expect(screen.getByTestId("empty-icon")).toBeInTheDocument();
  });

  it("renders the description when provided", () => {
    render(<EmptyState icon={Icon} title="Nothing here" description="Create your first request." />);
    expect(screen.getByText("Create your first request.")).toBeInTheDocument();
  });

  it("renders the action slot when provided", () => {
    render(
      <EmptyState icon={Icon} title="Nothing here" action={<button type="button">New request</button>} />,
    );
    expect(screen.getByRole("button", { name: "New request" })).toBeInTheDocument();
  });
});
