import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatCard, StatCell } from "./stat-cell";

const Icon = ({ className }: { className?: string }) => <svg data-testid="stat-icon" className={className} />;

describe("StatCell", () => {
  it("renders the title and value", () => {
    render(<StatCell title="Open requests" value={12} icon={Icon} />);
    expect(screen.getByText("Open requests")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
  });

  it("renders the icon", () => {
    render(<StatCell title="Open requests" value={12} icon={Icon} />);
    expect(screen.getByTestId("stat-icon")).toBeInTheDocument();
  });

  it("renders the sub line when provided", () => {
    render(<StatCell title="Resolved" value="8" icon={Icon} sub="this month" />);
    expect(screen.getByText("this month")).toBeInTheDocument();
  });

  it("omits the sub line when not provided", () => {
    render(<StatCell title="Resolved" value="8" icon={Icon} />);
    expect(screen.queryByText("this month")).not.toBeInTheDocument();
  });

  it("exposes StatCard as an alias", () => {
    expect(StatCard).toBe(StatCell);
  });
});
