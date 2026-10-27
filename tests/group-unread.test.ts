import { describe, it, expect, beforeEach, vi } from "vitest";

// The Groups badge rides this one count. What matters is that "unread" stays
// per-membership: each group carries its own read marker, so a single global
// timestamp would be wrong for anyone in more than one group.

vi.mock("@/lib/db/prisma", () => ({
  default: {
    groupMember: { findMany: vi.fn() },
    groupMessage: { count: vi.fn() },
  },
}));

import prisma from "@/lib/db/prisma";
import { countUnreadGroupMessages } from "@/lib/notifications/groupUnread";

const groupMemberFindMany = prisma.groupMember.findMany as ReturnType<typeof vi.fn>;
const groupMessageCount = prisma.groupMessage.count as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  groupMemberFindMany.mockResolvedValue([]);
  groupMessageCount.mockResolvedValue(0);
});

describe("countUnreadGroupMessages", () => {
  it("skips the count query entirely for a user in no groups", async () => {
    groupMemberFindMany.mockResolvedValue([]);
    const unread = await countUnreadGroupMessages("u1");
    expect(unread).toBe(0);
    expect(groupMessageCount).not.toHaveBeenCalled();
  });

  it("excludes my own messages and tombstones", async () => {
    groupMemberFindMany.mockResolvedValue([{ groupId: "g1", lastReadAt: new Date(1000) }]);
    groupMessageCount.mockResolvedValue(3);

    await countUnreadGroupMessages("u1");

    const where = groupMessageCount.mock.calls[0][0].where;
    expect(where.senderId).toEqual({ not: "u1" });
    expect(where.deletedForEveryone).toBe(false);
  });

  it("uses each group's own read marker, not one global timestamp", async () => {
    groupMemberFindMany.mockResolvedValue([
      { groupId: "g1", lastReadAt: new Date(5000) },
      { groupId: "g2", lastReadAt: new Date(9000) },
    ]);

    await countUnreadGroupMessages("u1");

    const where = groupMessageCount.mock.calls[0][0].where;
    expect(where.OR).toEqual([
      { groupId: "g1", createdAt: { gt: new Date(5000) } },
      { groupId: "g2", createdAt: { gt: new Date(9000) } },
    ]);
  });

  it("treats a never-opened group as fully unread", async () => {
    groupMemberFindMany.mockResolvedValue([{ groupId: "g1", lastReadAt: null }]);
    groupMessageCount.mockResolvedValue(12);

    const unread = await countUnreadGroupMessages("u1");

    expect(unread).toBe(12);
    const where = groupMessageCount.mock.calls[0][0].where;
    expect(where.OR).toEqual([{ groupId: "g1", createdAt: { gt: new Date(0) } }]);
  });
});
