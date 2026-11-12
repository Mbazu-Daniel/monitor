import { describe, expect, it } from "vitest";
import { canTransition, nextActionsFor, permissionError } from "./workflow.js";

describe("canTransition", () => {
  it("allows the happy path OPEN -> ASSIGNED -> IN_PROGRESS -> RESOLVED -> CLOSED", () => {
    expect(canTransition("OPEN", "ASSIGNED")).toBe(true);
    expect(canTransition("ASSIGNED", "IN_PROGRESS")).toBe(true);
    expect(canTransition("IN_PROGRESS", "RESOLVED")).toBe(true);
    expect(canTransition("RESOLVED", "CLOSED")).toBe(true);
  });

  it("rejects skipping the workflow", () => {
    expect(canTransition("OPEN", "CLOSED")).toBe(false);
    expect(canTransition("OPEN", "RESOLVED")).toBe(false);
    expect(canTransition("RESOLVED", "OPEN")).toBe(false);
  });

  it("allows reopening from CLOSED and REJECTED", () => {
    expect(canTransition("CLOSED", "OPEN")).toBe(true);
    expect(canTransition("REJECTED", "OPEN")).toBe(true);
  });
});

describe("permissionError", () => {
  const admin = { role: "ADMIN" as const, isAssignedOfficer: false, isCreator: false };
  const officer = { role: "OFFICER" as const, isAssignedOfficer: true, isCreator: false };
  const otherOfficer = { role: "OFFICER" as const, isAssignedOfficer: false, isCreator: false };
  const creator = { role: "STAFF" as const, isAssignedOfficer: false, isCreator: true };
  const bystander = { role: "STAFF" as const, isAssignedOfficer: false, isCreator: false };

  it("rejects an illegal transition regardless of role", () => {
    expect(permissionError(admin, "OPEN", "CLOSED")).toBe("Cannot change status from OPEN to CLOSED.");
  });

  it("lets an admin move a request anywhere the workflow allows", () => {
    expect(permissionError(admin, "ASSIGNED", "REJECTED")).toBeNull();
  });

  it("lets the request owner close a resolved request", () => {
    expect(permissionError(creator, "RESOLVED", "CLOSED")).toBeNull();
  });

  it("stops a bystander from closing a resolved request", () => {
    expect(permissionError(bystander, "RESOLVED", "CLOSED")).toBe(
      "Only the request owner can close a resolved request, or an administrator.",
    );
  });

  it("lets the assigned officer set progress transitions", () => {
    expect(permissionError(officer, "ASSIGNED", "IN_PROGRESS")).toBeNull();
    expect(permissionError(officer, "IN_PROGRESS", "RESOLVED")).toBeNull();
    expect(permissionError(officer, "IN_PROGRESS", "ON_HOLD")).toBeNull();
  });

  it("refuses an unassigned officer", () => {
    expect(permissionError(otherOfficer, "ASSIGNED", "IN_PROGRESS")).toBe(
      "You can only update requests assigned to you.",
    );
  });

  it("refuses officer transitions outside progress states", () => {
    expect(permissionError(officer, "ASSIGNED", "REJECTED")).toBe(
      "Maintenance officers can set In progress, On hold or Resolved.",
    );
  });

  it("refuses anyone else entirely", () => {
    expect(permissionError(bystander, "OPEN", "IN_PROGRESS")).toBe(
      "You do not have permission to change this request's status.",
    );
  });
});

describe("nextActionsFor", () => {
  it("offers an admin the reject action on an open request", () => {
    const actions = nextActionsFor({ role: "ADMIN", isAssignedOfficer: false, isCreator: false }, "OPEN");
    expect(actions.map((a) => a.to)).toEqual(["REJECTED"]);
  });

  it("offers the assigned officer the work actions", () => {
    const actions = nextActionsFor(
      { role: "OFFICER", isAssignedOfficer: true, isCreator: false },
      "IN_PROGRESS",
    );
    expect(actions.map((a) => a.to)).toEqual(["RESOLVED", "ON_HOLD"]);
  });

  it("offers nothing to an officer who is not assigned", () => {
    expect(
      nextActionsFor({ role: "OFFICER", isAssignedOfficer: false, isCreator: false }, "IN_PROGRESS"),
    ).toEqual([]);
  });

  it("offers the creator the confirm-and-close action on a resolved request", () => {
    const actions = nextActionsFor({ role: "STAFF", isAssignedOfficer: false, isCreator: true }, "RESOLVED");
    expect(actions.map((a) => a.to)).toEqual(["CLOSED"]);
  });

  it("offers staff who do not own the request nothing", () => {
    expect(
      nextActionsFor({ role: "STAFF", isAssignedOfficer: false, isCreator: false }, "RESOLVED"),
    ).toEqual([]);
  });
});
