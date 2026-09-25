import { describe, it, expect, beforeEach, vi } from "vitest";

// collectDelta is the realtime spine: one function defines what "everything
// new/changed for user X since cursor Y" means for both SSE and poll. These
// tests pin the contract — cursor math, signal expiry, blocked-user filters,
// reaction aggregation, and call-signal translation.

vi.mock("@/lib/prisma", () => {
  return {
    default: {
      message: { findMany: vi.fn(), count: vi.fn() },
      groupMessage: { findMany: vi.fn() },
      messageReaction: { findMany: vi.fn() },
      notification: { count: vi.fn() },
      callSignal: { findMany: vi.fn() },
    },
  };
});

vi.mock("@/lib/blocking", () => ({
  getBlockedIds: vi.fn().mockResolvedValue([]),
}));

import prisma from "@/lib/prisma";
import { getBlockedIds } from "@/lib/blocking";
import { collectDelta, SKEW_MS } from "@/lib/realtime/collect-delta";

const messageFindMany = prisma.message.findMany as ReturnType<typeof vi.fn>;
const groupMessageFindMany = prisma.groupMessage.findMany as ReturnType<typeof vi.fn>;
const reactionFindMany = prisma.messageReaction.findMany as ReturnType<typeof vi.fn>;
const notificationCount = prisma.notification.count as ReturnType<typeof vi.fn>;
const messageCount = prisma.message.count as ReturnType<typeof vi.fn>;
const callSignalFindMany = prisma.callSignal.findMany as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  messageFindMany.mockResolvedValue([]);
  groupMessageFindMany.mockResolvedValue([]);
  reactionFindMany.mockResolvedValue([]);
  notificationCount.mockResolvedValue(0);
  messageCount.mockResolvedValue(0);
  callSignalFindMany.mockResolvedValue([]);
  (getBlockedIds as any).mockResolvedValue([]);
});

describe("cursor math", () => {
  it("advances nextSince to now minus the skew window", async () => {
    const delta = await collectDelta("u1", 1000, 10_000);
    expect(delta.nextSince).toBe(10_000 - SKEW_MS);
  });

  it("clamps a negative since to epoch instead of querying the future", async () => {
    await collectDelta("u1", -5000, 10_000);
    const where = messageFindMany.mock.calls[0][0].where;
    expect(where.createdAt.gt).toEqual(new Date(0));
  });
});

describe("call signal window", () => {
  it("first tick (since=0) floors signals at now-30s — no stale rings", async () => {
    await collectDelta("u1", 0, Date.now());
    const where = callSignalFindMany.mock.calls[0][0].where;
    const floor: Date = where.createdAt.gt;
    expect(floor.getTime()).toBeGreaterThan(Date.now() - 31_000);
    expect(floor.getTime()).toBeLessThanOrEqual(Date.now() - 29_000);
  });

  it("an established cursor wins over the 30s floor when newer", async () => {
    const since = Date.now() - 5_000;
    await collectDelta("u1", since, Date.now());
    const where = callSignalFindMany.mock.calls[0][0].where;
    expect(where.createdAt.gt).toEqual(new Date(since));
  });
});

describe("blocked users", () => {
  it("passes blocked ids into every message query", async () => {
    (getBlockedIds as any).mockResolvedValue(["bad-1"]);
    await collectDelta("u1", 0, 1000);

    const freshWhere = messageFindMany.mock.calls[0][0].where;
    expect(freshWhere.senderId.notIn).toEqual(["bad-1"]);

    // changed-rows scan (second message.findMany call) must filter too
    await collectDelta("u1", 500, 2000);
    const changedWhere = messageFindMany.mock.calls[1][0].where;
    expect(changedWhere.senderId.notIn).toEqual(["bad-1"]);
  });

  it("asks for blocked ids with the requesting user", async () => {
    await collectDelta("u1", 0, 1000);
    expect(getBlockedIds).toHaveBeenCalledWith("u1");
  });
});

describe("message shaping", () => {
  it("reverses the newest-first query into ascending delivery order", async () => {
    messageFindMany.mockResolvedValueOnce([
      { id: "m2", senderId: "s", createdAt: new Date(2000) },
      { id: "m1", senderId: "s", createdAt: new Date(1000) },
    ]);
    const delta = await collectDelta("u1", 0, 3000);
    expect(delta.messages.map((m: any) => m.message.id)).toEqual(["m1", "m2"]);
    expect(delta.messages[0]).toMatchObject({ senderId: "s", timestamp: 1000 });
  });

  it("hides tombstones in fresh history (they ride the changed scan)", async () => {
    await collectDelta("u1", 0, 1000);
    const where = groupMessageFindMany.mock.calls[0][0].where;
    expect(where.deletedForEveryone).toBe(false);
  });

  it("dedupes fresh rows out of the changed scan via id notIn", async () => {
    messageFindMany.mockResolvedValueOnce([{ id: "m1", createdAt: new Date(1) }]);
    await collectDelta("u1", 0, 1000);
    const changedWhere = messageFindMany.mock.calls[1][0].where;
    expect(changedWhere.id.notIn).toEqual(["m1"]);
  });
});

describe("unread counters", () => {
  it("reports notification and message counts separately", async () => {
    notificationCount.mockResolvedValue(7);
    messageCount.mockResolvedValue(3);
    const delta = await collectDelta("u1", 0, 1000);
    expect(delta.unreadNotifications).toBe(7);
    expect(delta.unreadMessages).toBe(3);
  });

  it("excludes message-type notifications from the bell count", async () => {
    await collectDelta("u1", 0, 1000);
    const where = notificationCount.mock.calls[0][0].where;
    expect(where.NOT).toEqual({ type: "message" });
    expect(where.read).toBe(false);
  });
});

describe("reaction aggregation", () => {
  it("groups touched messages and fetches one full list per message", async () => {
    reactionFindMany
      .mockResolvedValueOnce([
        // raw createdAt scan: two reactions on the same message
        { id: "r1", messageId: "m1" },
        { id: "r2", messageId: "m1" },
      ])
      .mockResolvedValueOnce([
        // the follow-up full-list fetch
        { id: "r1", messageId: "m1", emoji: "👍" },
        { id: "r2", messageId: "m1", emoji: "🔥" },
      ]);
    const delta = await collectDelta("u1", 0, 1000);
    expect(delta.reactions).toHaveLength(1);
    expect(delta.reactions[0].messageId).toBe("m1");
    expect(delta.reactions[0].reactions).toHaveLength(2);
  });

  it("skips the full-list query when nothing changed", async () => {
    await collectDelta("u1", 0, 1000);
    expect(reactionFindMany).toHaveBeenCalledTimes(1); // only the raw scan
  });

  it("attaches current reaction lists to changed rows (removals sync)", async () => {
    messageFindMany
      .mockResolvedValueOnce([]) // fresh
      .mockResolvedValueOnce([{ id: "m9" }]); // changed
    reactionFindMany
      .mockResolvedValueOnce([]) // raw scan: no new reactions
      .mockResolvedValueOnce([{ id: "r5", messageId: "m9", emoji: "🎉" }]);
    const delta = await collectDelta("u1", 0, 1000);
    expect((delta.changedMessages[0] as any).reactions).toHaveLength(1);
  });
});

describe("call signal translation", () => {
  function signal(id: string, type: string, payload: any) {
    return { id, type, payload, senderId: "peer-1", receiverId: "u1", createdAt: new Date() };
  }

  it("maps stored rows onto the WS event names", async () => {
    callSignalFindMany.mockResolvedValue([
      signal("s1", "call-offer", { callerName: "Ann", offer: { type: "offer", sdp: "x" }, callType: "audio" }),
      signal("s2", "call-answer", { answer: { type: "answer", sdp: "y" } }),
      signal("s3", "call-end", {}),
      signal("s4", "ice-candidate", { candidate: { candidate: "cand" } }),
    ]);
    const delta = await collectDelta("u1", 0, Date.now());
    expect(delta.callSignals.map((s) => s.event)).toEqual([
      "incoming-call",
      "call-accepted",
      "call-ended",
      "ice-candidate",
    ]);
  });

  it("keeps the payload fields each client handler reads", async () => {
    callSignalFindMany.mockResolvedValue([
      signal("s1", "call-offer", { callerName: "Ann", callerAvatar: "a.png", offer: { sdp: "o" }, callType: "video" }),
      signal("s2", "ice-candidate", { candidate: { candidate: "c" } }),
    ]);
    const delta = await collectDelta("u1", 0, Date.now());
    expect(delta.callSignals[0].data).toEqual({
      callerId: "peer-1",
      callerName: "Ann",
      callerAvatar: "a.png",
      offer: { sdp: "o" },
      callType: "video",
    });
    expect(delta.callSignals[1].data).toEqual({
      candidate: { candidate: "c" },
      fromUserId: "peer-1",
    });
  });
});
