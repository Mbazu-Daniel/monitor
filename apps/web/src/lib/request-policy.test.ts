import { describe, expect, it } from "vitest";
import { computePolicy } from "./request-policy";
import type { RequestDetail } from "@/types";

const baseRequest: RequestDetail = {
  id: "req-1",
  reference: "SR-1",
  title: "Leaky pipe",
  description: "Water leaking above the toilet ceiling.",
  location: "Block D",
  priority: "HIGH",
  status: "ASSIGNED",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  category: { id: "cat-1", name: "Plumbing & Water", description: "", icon: "Droplets" },
  creator: { id: "user-student", name: "Sunny", email: "sunny@miva.edu", department: null, matricNo: "S0001" },
  attachments: [],
  assignments: [],
  statusLogs: [],
  comments: [],
};

const staff = { id: "user-staff", name: "Ada", email: "ada@miva.edu", role: "STAFF" as const, createdAt: "2026-01-01T00:00:00.000Z" };
const officer = { ...staff, id: "user-officer", role: "OFFICER" as const };
const admin = { ...staff, id: "user-admin", role: "ADMIN" as const };
const creator = { ...staff, id: "user-student", role: "STUDENT" as const };
const assigned = {
  ...baseRequest,
  assignments: [{
    id: "asg-1",
    note: null,
    isActive: true,
    createdAt: "2026-01-02T00:00:00.000Z",
    releasedAt: null,
    officer: { id: "user-officer", name: "Officer Ada", email: "officer@miva.edu", phone: null, department: null },
    assignedByUser: { id: "user-admin", name: "Admin Ann" },
  }],
};

describe("computePolicy", () => {
  it("gives an unassigned staff member neither actions nor comment access", () => {
    const policy = computePolicy(staff, baseRequest);
    expect(policy.isAdmin).toBe(false);
    expect(policy.actions).toEqual([]);
    expect(policy.canComment).toBe(false);
    expect(policy.canDelete).toBe(false);
  });

  it("recognizes the assigned officer and allows comments but not delete", () => {
    const policy = computePolicy(officer, assigned);
    expect(policy.activeAssignment?.officer.id).toBe("user-officer");
    expect(policy.canComment).toBe(true);
    expect(policy.canDelete).toBe(false);
    expect(policy.actions.map((a) => a.label)).toEqual(["Start Work", "Hold"]);
  });

  it("denies an officer who is not assigned to this request", () => {
    const otherOfficer = { ...officer, id: "user-officer-2" };
    const policy = computePolicy(otherOfficer, assigned);
    expect(policy.canComment).toBe(false);
    expect(policy.actions).toEqual([]);
  });

  it("lets the creator close a resolved request but not delete an assigned one", () => {
    const open = { ...baseRequest, status: "OPEN" as const };
    const policyOpen = computePolicy(creator, open);
    expect(policyOpen.canDelete).toBe(true);
    expect(policyOpen.canComment).toBe(true);
    expect(policyOpen.actions).toEqual([]);

    const policyAssigned = computePolicy(creator, baseRequest);
    expect(policyAssigned.canDelete).toBe(false);

    const resolved = { ...baseRequest, status: "RESOLVED" as const };
    const policyResolved = computePolicy(creator, resolved);
    expect(policyResolved.actions.map((a) => a.label)).toEqual(["Confirm Fixed & Close"]);
  });

  it("gives admins the admin action set", () => {
    const policy = computePolicy(admin, baseRequest);
    expect(policy.isAdmin).toBe(true);
    expect(policy.actions.length).toBeGreaterThan(0);
    expect(policy.canComment).toBe(true);
    expect(policy.canDelete).toBe(true);
  });

  it("returns an empty action set for anonymous users", () => {
    const policy = computePolicy(null, baseRequest);
    expect(policy.actions).toEqual([]);
    expect(policy.canDelete).toBe(false);
    expect(policy.canComment).toBe(false);
  });

  it("excludes inactive assignments from the active assignment", () => {
    const inactive = {
      ...baseRequest,
      assignments: [{
        ...assigned.assignments[0],
        isActive: false,
        releasedAt: "2026-01-03T00:00:00.000Z",
      }],
    };
    const policy = computePolicy(officer, inactive);
    expect(policy.activeAssignment).toBeNull();
    expect(policy.canComment).toBe(false);
  });
});
