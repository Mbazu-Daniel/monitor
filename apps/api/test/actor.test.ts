import { describe, expect, it } from "vitest";
import { toActor, toLogActor, creatorSelect, officerSelect, assignedBySelect } from "../src/common/utils/actor.ts";

describe("toActor", () => {
  const member = { role: "OFFICER", user: { id: "user-officer", name: "Ada", email: "ada@example.com" } };

  it("collapses membership + user into the flat actor and keeps the membership role", () => {
    expect(toActor(member)).toEqual({ id: "user-officer", name: "Ada", email: "ada@example.com", role: "OFFICER" });
  });

  it("returns null for missing members", () => {
    expect(toActor(null)).toBeNull();
    expect(toActor(undefined)).toBeNull();
  });
});

describe("toLogActor", () => {
  const user = { id: "user-1", name: "Chidi" };

  it("prefers the membership and its role", () => {
    expect(toLogActor({ member: { role: "ADMIN", user: { id: "user-1", name: "Chidi" } }, user }))
      .toEqual({ id: "user-1", name: "Chidi", role: "ADMIN" });
  });

  it("falls back to the bare user with a null role (platform events)", () => {
    expect(toLogActor({ member: null, user })).toEqual({ id: "user-1", name: "Chidi", role: null });
  });

  it("returns null when neither is present", () => {
    expect(toLogActor({ member: null, user: null })).toBeNull();
  });
});

describe("shared select fragments", () => {
  it("exposes the creator, officer and assigner shapes", () => {
    expect(creatorSelect.select).toHaveProperty("matricNo");
    expect(officerSelect.select).toHaveProperty("phone");
    expect(assignedBySelect.select).toEqual({ id: true, name: true });
  });
});
