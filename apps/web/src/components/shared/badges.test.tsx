import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Priority, RequestStatus, UserRole } from "@/types";
import { PRIORITY_META, PriorityBadge, ROLE_META, RoleBadge, STATUS_META, StatusBadge } from "./badges";

describe("StatusBadge", () => {
  it.each(Object.entries(STATUS_META))("renders %s as %s", (status, meta) => {
    render(<StatusBadge status={status as RequestStatus} />);
    expect(screen.getByText(meta.label)).toBeInTheDocument();
  });

});

describe("PriorityBadge", () => {
  it.each(Object.entries(PRIORITY_META))("renders %s as %s", (priority, meta) => {
    render(<PriorityBadge priority={priority as Priority} />);
    expect(screen.getByText(meta.label)).toBeInTheDocument();
  });

});

describe("RoleBadge", () => {
  it.each(Object.entries(ROLE_META))("renders %s as %s", (role, meta) => {
    render(<RoleBadge role={role as UserRole} />);
    expect(screen.getByText(meta.label)).toBeInTheDocument();
  });

  it("renders nothing for a null role", () => {
    const { container } = render(<RoleBadge role={null} />);
    expect(container).toBeEmptyDOMElement();
  });

});
