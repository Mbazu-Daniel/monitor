import { describe, expect, it } from "vitest";
import { canAttach, canComment, canDelete, canEdit, canView, type PolicyRequest } from "./policy.js";

const open: PolicyRequest = {
  creatorId: "member-creator",
  assignments: [{ officerId: "member-officer", isActive: true }],
};
const assignedOnly: PolicyRequest = {
  creatorId: "member-creator",
  assignments: [{ officerId: "member-officer", isActive: false }, { officerId: "member-old", isActive: false }],
};

const admin = { role: "ADMIN", id: "member-admin" };
const creator = { role: "STUDENT", id: "member-creator" };
const officer = { role: "OFFICER", id: "member-officer" };
const stranger = { role: "STUDENT", id: "member-stranger" };
const anon = { role: null, id: null };

describe("canView", () => {
  it("allows admins, the creator and the assigned officer", () => {
    expect(canView(admin, open)).toBe(true);
    expect(canView(creator, open)).toBe(true);
    expect(canView(officer, open)).toBe(true);
  });
  it("denies strangers and anonymous actors", () => {
    expect(canView(stranger, open)).toBe(false);
    expect(canView(anon, open)).toBe(false);
  });
  it("denies the officer when the assignment is no longer active", () => {
    expect(canView(officer, assignedOnly)).toBe(false);
  });
  it("denies a non-officer whose id matches an assignment", () => {
    expect(canView({ role: "STUDENT", id: "member-officer" }, open)).toBe(false);
  });
});

describe("canAttach", () => {
  it("allows admins, the creator and any actively assigned officer", () => {
    expect(canAttach(admin, open)).toBe(true);
    expect(canAttach(creator, open)).toBe(true);
    expect(canAttach(officer, open)).toBe(true);
  });
  it("denies strangers and inactive assignments", () => {
    expect(canAttach(stranger, open)).toBe(false);
    expect(canAttach(officer, assignedOnly)).toBe(false);
  });
});

describe("canComment", () => {
  it("shares the view gate", () => {
    expect(canComment(admin, open)).toBe(canView(admin, open));
    expect(canComment(creator, open)).toBe(canView(creator, open));
    expect(canComment(officer, open)).toBe(canView(officer, open));
    expect(canComment(stranger, open)).toBe(canView(stranger, open));
  });
});

describe("canEdit / canDelete", () => {
  it("allows the creator only while OPEN", () => {
    expect(canEdit(creator, open, "OPEN")).toBe(true);
    expect(canDelete(creator, open, "OPEN")).toBe(true);
    expect(canEdit(creator, open, "IN_PROGRESS")).toBe(false);
    expect(canDelete(creator, open, "ASSIGNED")).toBe(false);
  });
  it("allows admins in any status", () => {
    for (const status of ["OPEN", "ASSIGNED", "IN_PROGRESS", "ON_HOLD", "RESOLVED", "CLOSED", "REJECTED"] as const) {
      expect(canEdit(admin, open, status)).toBe(true);
      expect(canDelete(admin, open, status)).toBe(true);
    }
  });
  it("denies officers and strangers", () => {
    expect(canEdit(officer, open, "OPEN")).toBe(false);
    expect(canDelete(stranger, open, "OPEN")).toBe(false);
  });
});
