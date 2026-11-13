import { describe, expect, it } from "vitest";
import type { PrismaClient } from "../src/generated/prisma/client.ts";
import { CommentsService } from "../src/requests/comments.service.ts";
import { makeMocks } from "./test-utils.ts";

const admin = { organizationId: "org-1", role: "ADMIN" as const, memberId: "member-admin" };

function makeFakes() {
  const mocks = makeMocks();
  const service = new CommentsService(
    mocks.db as unknown as PrismaClient,
    mocks.realtime as never,
    mocks.notifications as never,
  );
  return { service, ...mocks };
}

describe("createComment", () => {
  it("notifies the creator and the active officer, excluding the author", async () => {
    const { service, notifications } = makeFakes();
    const result = await service.createComment({ id: "user-admin", name: "Admin Ann" }, "req-1", { body: "Looking into it" } as never, admin);
    expect(result.comment.body).toBe("Looking into it");
    const audiences = notifications.announce.mock.calls.map((call) => call[1]);
    expect(audiences).toHaveLength(1);
    expect(audiences[0]?.userIds).toEqual(expect.arrayContaining(["user-for-member-student", "user-for-member-officer"]));
  });

  it("excludes the author from the notified set when they are the creator", async () => {
    const { service, notifications } = makeFakes();
    await service.createComment({ id: "user-student", name: "Chidi" }, "req-1", { body: "Any updates?" } as never, { organizationId: "org-1", role: "STUDENT" as const, memberId: "member-student" });
    const audiences = notifications.announce.mock.calls.map((call) => call[1]);
    expect(audiences).toHaveLength(1);
    expect(audiences[0]?.userIds).toEqual(["user-for-member-officer"]);
  });
});
