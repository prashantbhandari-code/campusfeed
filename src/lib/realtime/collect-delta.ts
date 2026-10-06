import prisma from "@/lib/prisma";
import { USER_SELECT } from "@/lib/user";

export { USER_SELECT };
import { getBlockedIds } from "@/lib/blocking";

// Shared delta collector for both realtime transports (SSE stream and the
// JSON poll fallback). One source of truth for what "everything new/changed
// for this user since cursor X" means.
//
// The caller passes `now` (captured once per tick) and gets back the cursor
// to use next tick; using the same `now` for every query in a tick keeps the
// cursor monotonic even under concurrent writes.


// Re-scan the last 3s on each tick so a message written between query and
// timestamp can't be missed; client dedupes by id.
export const SKEW_MS = 3000;

// The group-membership relation join ran twice per tick per stream. Cache the
// member's group ids for 5s: joining a group delays fresh delivery by at most
// one cache window — imperceptible for a rare action.
const GROUP_TTL_MS = 5000;
const groupIdsCache = new Map<string, { ids: string[]; expires: number }>();

async function getMyGroupIds(userId: string): Promise<string[]> {
  const now = Date.now();
  const hit = groupIdsCache.get(userId);
  if (hit && hit.expires > now) return hit.ids;
  const memberships = await prisma.groupMember.findMany({
    where: { userId },
    select: { groupId: true },
  });
  const ids = memberships.map((m) => m.groupId);
  groupIdsCache.set(userId, { ids, expires: now + GROUP_TTL_MS });
  if (groupIdsCache.size > 10_000) {
    groupIdsCache.forEach((v, k) => {
      if (v.expires <= now) groupIdsCache.delete(k);
    });
  }
  return ids;
}

export interface Delta {
  messages: any[];
  changedMessages: any[];
  groupMessages: any[];
  changedGroupMessages: any[];
  reactions: Array<{ messageId: string; reactions: any[] }>;
  callSignals: Array<{ id: string; event: string; data: any }>;
  unreadNotifications: number;
  unreadMessages: number;
  nextSince: number;
}

export async function collectDelta(
  userId: string,
  since: number,
  now: number
): Promise<Delta> {
  const gt = new Date(Math.max(0, since));
  // Call signals expire: never replay a ring older than 30s (first tick has since=0).
  const signalFloor = new Date(Math.max(since, Date.now() - 30_000));

  // Blocked users never deliver into any transport (either direction).
  // getBlockedIds is TTL-cached in blocking.ts; group membership likewise.
  const blockedIds = await getBlockedIds(userId);
  const myGroupIds = await getMyGroupIds(userId);

  // Newest-first + take 50 so a first tick (since=0) can't skip recent
  // messages behind a full page of older history.
  const [messages, groupMessages, rawReactions, unreadNotifications, unreadMessages, rawCallSignals] = await Promise.all([
    prisma.message.findMany({
      where: { receiverId: userId, senderId: { notIn: blockedIds }, createdAt: { gt } },
      include: { sender: { select: USER_SELECT }, receiver: { select: USER_SELECT } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.groupMessage.findMany({
      where: {
        createdAt: { gt },
        senderId: { notIn: blockedIds },
        deletedForEveryone: false, // fresh history hides tombstones; the changed-rows scan delivers them
        groupId: { in: myGroupIds },
      },
      include: { sender: { select: USER_SELECT }, group: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.messageReaction.findMany({
      where: {
        createdAt: { gt },
        message: { OR: [{ senderId: userId }, { receiverId: userId }] },
      },
      select: { id: true, emoji: true, messageId: true, userId: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    // Message alerts belong to the Messages badge, not the bell
    prisma.notification.count({ where: { userId, read: false, NOT: { type: "message" } } }),
    prisma.message.count({ where: { receiverId: userId, read: false } }),
    prisma.callSignal.findMany({
      where: { receiverId: userId, createdAt: { gt: signalFloor } },
      orderBy: { createdAt: "asc" },
      take: 50,
    }),
  ]);

  // Changed rows in both directions. Tombstones MUST be included (not
  // filtered) — that's how other devices learn about an unsend.
  const freshIds = [...messages.map((m) => m.id), ...groupMessages.map((m) => m.id)];
  const [changedMessages, changedGroupMessages] = await Promise.all([
    prisma.message.findMany({
      where: {
        updatedAt: { gt },
        id: { notIn: freshIds },
        OR: [{ senderId: userId }, { receiverId: userId }],
        senderId: { notIn: blockedIds },
      },
      include: {
        sender: { select: USER_SELECT },
        receiver: { select: USER_SELECT },
        replyTo: {
          select: {
            id: true, content: true, fileUrl: true, fileType: true, fileName: true,
            senderId: true, deletedForEveryone: true,
            sender: { select: { id: true, name: true, username: true, avatar: true } },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
    }),
    prisma.groupMessage.findMany({
      where: {
        updatedAt: { gt },
        id: { notIn: freshIds },
        senderId: { notIn: blockedIds },
        groupId: { in: myGroupIds },
      },
      include: { sender: { select: USER_SELECT }, group: { select: { id: true, name: true } } },
      orderBy: { updatedAt: "desc" },
      take: 50,
    }),
  ]);

  // Attach current reaction lists to changed rows so reaction removals sync
  // too — a deleted reaction row can't be found by the createdAt scan.
  const changedIds = changedMessages.map((m) => m.id);
  if (changedIds.length > 0) {
    const all = await prisma.messageReaction.findMany({
      where: { messageId: { in: changedIds } },
      select: { id: true, emoji: true, messageId: true, userId: true, createdAt: true, user: { select: USER_SELECT } },
    });
    for (const m of changedMessages) (m as any).reactions = all.filter((r) => r.messageId === m.id);
  }

  // Full reaction lists for every message touched in this window (they render
  // as complete chips, not incremental adds)
  const reactionPayload: Array<{ messageId: string; reactions: any[] }> = [];
  const touchedIds = Array.from(new Set(rawReactions.map((r) => r.messageId)));
  if (touchedIds.length > 0) {
    const all = await prisma.messageReaction.findMany({
      where: { messageId: { in: touchedIds } },
      select: { id: true, emoji: true, messageId: true, userId: true, createdAt: true, user: { select: USER_SELECT } },
    });
    for (const id of touchedIds) {
      reactionPayload.push({ messageId: id, reactions: all.filter((r) => r.messageId === id) });
    }
  }

  // Translate stored signals into the same event names server.ts emits on WS.
  const callSignalsOut = rawCallSignals.map((s) => {
    const p: any = s.payload;
    if (s.type === "call-offer")
      return { id: s.id, event: "incoming-call", data: { callerId: s.senderId, callerName: p.callerName, callerAvatar: p.callerAvatar, offer: p.offer, callType: p.callType } };
    if (s.type === "call-answer")
      return { id: s.id, event: "call-accepted", data: { answer: p.answer, receiverId: s.senderId } };
    if (s.type === "call-end")
      return { id: s.id, event: "call-ended", data: { endedBy: s.senderId } };
    return { id: s.id, event: "ice-candidate", data: { candidate: p.candidate, fromUserId: s.senderId } };
  });

  return {
    messages: messages.reverse().map((m) => ({ message: m, senderId: m.senderId, timestamp: m.createdAt.getTime() })),
    changedMessages: changedMessages.reverse(),
    groupMessages: groupMessages.reverse(),
    changedGroupMessages: changedGroupMessages.reverse(),
    reactions: reactionPayload,
    callSignals: callSignalsOut,
    unreadNotifications,
    unreadMessages,
    nextSince: now - SKEW_MS,
  };
}
