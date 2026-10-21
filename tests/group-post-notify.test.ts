import { describe, it, expect, beforeEach, vi } from "vitest";

// Posting in a group notifies the other members. This is the one path that
// can't be exercised by hand without two real accounts, so it's pinned here:
// who gets notified, who doesn't, and that a failed fan-out can never cost
// someone their post.

vi.mock("@/lib/server-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  default: {
    groupMember: { findUnique: vi.fn(), findMany: vi.fn() },
    groupPost: { create: vi.fn() },
    group: { findUnique: vi.fn() },
    notification: { createMany: vi.fn() },
  },
}));
vi.mock("@/lib/blocking", () => ({ getBlockedIds: vi.fn().mockResolvedValue([]) }));
vi.mock("@/lib/push", () => ({ sendPush: vi.fn().mockResolvedValue(undefined) }));

import { getServerSession } from "@/lib/server-auth";
import prisma from "@/lib/prisma";
import { sendPush } from "@/lib/push";
import { POST } from "@/app/api/groups/[id]/posts/route";

const getSession = getServerSession as ReturnType<typeof vi.fn>;
const memberFindUnique = prisma.groupMember.findUnique as ReturnType<typeof vi.fn>;
const memberFindMany = prisma.groupMember.findMany as ReturnType<typeof vi.fn>;
const groupFindUnique = prisma.group.findUnique as ReturnType<typeof vi.fn>;
const postCreate = prisma.groupPost.create as ReturnType<typeof vi.fn>;
const notificationCreateMany = prisma.notification.createMany as ReturnType<typeof vi.fn>;
const mockedSendPush = sendPush as ReturnType<typeof vi.fn>;

const AUTHOR = "author-1";

function request() {
  return new Request("http://x/api/groups/g1/posts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: "hello group" }),
  });
}

function context(groupId = "g1") {
  return { params: Promise.resolve({ id: groupId }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  getSession.mockResolvedValue({ user: { id: AUTHOR } });
  memberFindUnique.mockResolvedValue({ role: "member" });
  groupFindUnique.mockResolvedValue({ allowMemberPosts: true });
  memberFindMany.mockResolvedValue([]);
  notificationCreateMany.mockResolvedValue({ count: 0 });
  postCreate.mockResolvedValue({
    id: "post-1",
    author: { id: AUTHOR, name: "Ann" },
    group: { name: "CSE Department" },
  });
});

describe("group post notifications", () => {
  it("notifies every other member, never the author", async () => {
    memberFindMany.mockResolvedValue([{ userId: "m2" }, { userId: "m3" }]);

    const res = await POST(request(), context());

    expect(res.status).toBe(201);
    // The author must be filtered in the query, not after the fact
    expect(memberFindMany.mock.calls[0][0].where).toEqual({
      groupId: "g1",
      userId: { not: AUTHOR },
    });
    // postId carries the group id so the notification row can open the group
    // (asserted exactly — the target is part of the contract now).
    expect(notificationCreateMany.mock.calls[0][0].data).toEqual([
      { type: "group_post", userId: "m2", fromUserId: AUTHOR, postId: "g1" },
      { type: "group_post", userId: "m3", fromUserId: AUTHOR, postId: "g1" },
    ]);
  });

  it("pushes each recipient straight into the group's chat", async () => {
    memberFindMany.mockResolvedValue([{ userId: "m2" }]);

    await POST(request(), context());

    // The push opens the same place the notification row does: the Messages
    // inbox with that group's chat already showing.
    expect(mockedSendPush).toHaveBeenCalledWith(
      "m2",
      expect.objectContaining({
        title: "CSE Department",
        url: "/messages?tab=groups&group=g1",
      })
    );
  });

  it("skips the fan-out entirely for a one-member group", async () => {
    memberFindMany.mockResolvedValue([]);

    const res = await POST(request(), context());

    expect(res.status).toBe(201);
    expect(notificationCreateMany).not.toHaveBeenCalled();
    expect(mockedSendPush).not.toHaveBeenCalled();
  });

  it("still returns the post when the fan-out blows up", async () => {
    memberFindMany.mockResolvedValue([{ userId: "m2" }]);
    notificationCreateMany.mockRejectedValue(new Error("db down"));

    const res = await POST(request(), context());

    expect(res.status).toBe(201);
    await expect(res.json()).resolves.toMatchObject({ id: "post-1" });
  });

  it("refuses non-members before any notification work", async () => {
    memberFindUnique.mockResolvedValue(null);

    const res = await POST(request(), context());

    expect(res.status).toBe(403);
    expect(postCreate).not.toHaveBeenCalled();
    expect(memberFindMany).not.toHaveBeenCalled();
  });
});
