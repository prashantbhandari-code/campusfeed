import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromCookieHeader } from '@/lib/session-token';
import prisma from '@/lib/prisma';
import { getBlockedIds } from '@/lib/blocking';

// In-memory typing state (ephemeral, per-instance — fine for typing hints)
const typingUsers = new Map<string, { senderId: string; senderName: string; timestamp: number }>();

// Cleanup stale typing entries
setInterval(() => {
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
  Array.from(typingUsers.entries()).forEach(([userId, typing]) => {
    if (typing.timestamp < fiveMinutesAgo) {
      typingUsers.delete(userId);
    }
  });
}, 60 * 1000);

const USER_SELECT = { id: true, name: true, username: true, avatar: true, verified: true } as const;
// Re-scan the last 3s on each poll so a message written between query and
// timestamp can't be missed; client dedupes by id.
const POLL_SKEW_MS = 3000;

// POST: typing indicators (messages go through /api/messages → DB)
export async function POST(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const userId = getUserIdFromCookieHeader(cookieHeader);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, receiverId, senderName } = body;

    if (action === 'typing' && receiverId) {
      typingUsers.set(receiverId, {
        senderId: userId,
        senderName: senderName || 'User',
        timestamp: Date.now(),
      });
      return NextResponse.json({ success: true });
    }

    if (action === 'stop-typing' && receiverId) {
      typingUsers.delete(receiverId);
      return NextResponse.json({ success: true });
    }

    if (action === 'join-group' || action === 'leave-group') {
      // Rooms exist only in WebSocket mode; polling derives group access from
      // the DB on every request, so there is nothing to track here.
      return NextResponse.json({ success: true });
    }

    // WebRTC call signaling relay for the polling transport (server.ts covers
    // WS mode). Target key per event mirrors server.ts's socket handlers;
    // senderId always comes from the cookie, never the body.
    const CALL_TARGET_KEY: Record<string, string> = {
      'call-offer': 'receiverId',
      'call-answer': 'callerId',
      'call-end': 'otherUserId',
      'ice-candidate': 'targetUserId',
    };
    const targetKey = CALL_TARGET_KEY[action];
    if (targetKey) {
      const targetId = body[targetKey];
      if (!targetId) return NextResponse.json({ error: 'Missing target' }, { status: 400 });
      await prisma.callSignal.create({
        data: { senderId: userId, receiverId: targetId, type: action, payload: body },
      });
      // Signals are only deliverable for 30s — sweep expired rows here.
      await prisma.callSignal.deleteMany({
        where: { createdAt: { lt: new Date(Date.now() - 5 * 60 * 1000) } },
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Socket.IO polling error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET: Poll for new / changed messages, reactions, typing state.
// "Changed" rows (updatedAt > since) carry edits, delete-for-everyone
// tombstones and reaction-triggered bumps to every device — the original
// poll only delivered brand-new rows, so a second device never saw them.
export async function GET(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const userId = getUserIdFromCookieHeader(cookieHeader);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const since = parseInt(url.searchParams.get('since') || '0') || 0;
    const type = url.searchParams.get('type') || 'messages';

    if (type === 'typing') {
      const typing = typingUsers.get(userId);
      return NextResponse.json({ typing: typing || null });
    }

    const gt = new Date(Math.max(0, since));
    // Call signals expire: never replay a ring older than 30s (first poll has since=0).
    const signalFloor = new Date(Math.max(since, Date.now() - 30_000));

    // Blocked users never deliver into this poll (either direction)
    const blockedIds = await getBlockedIds(userId);

    // Newest-first + take 50 so a first poll (since=0) can't skip recent
    // messages behind a full page of older history.
    const [messages, groupMessages, rawReactions, unreadNotifications, unreadMessages, rawCallSignals] = await Promise.all([
      prisma.message.findMany({
        where: { receiverId: userId, senderId: { notIn: blockedIds }, createdAt: { gt } },
        include: { sender: { select: USER_SELECT }, receiver: { select: USER_SELECT } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.groupMessage.findMany({
        where: {
          createdAt: { gt },
          senderId: { notIn: blockedIds },
          deletedForEveryone: false, // fresh history hides tombstones; the changed-rows scan delivers them
          group: { members: { some: { userId } } },
        },
        include: { sender: { select: USER_SELECT }, group: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.messageReaction.findMany({
        where: {
          createdAt: { gt },
          message: { OR: [{ senderId: userId }, { receiverId: userId }] },
        },
        select: { id: true, emoji: true, messageId: true, userId: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      // Message alerts belong to the Messages badge, not the bell
      prisma.notification.count({ where: { userId, read: false, NOT: { type: "message" } } }),
      prisma.message.count({ where: { receiverId: userId, read: false } }),
      prisma.callSignal.findMany({
        where: { receiverId: userId, createdAt: { gt: signalFloor } },
        orderBy: { createdAt: 'asc' },
        take: 50,
      }),
    ]);

    // Changed rows in both conversations I'm part of. Tombstones MUST be
    // included (not filtered) — that's how other devices learn about an unsend.
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
        orderBy: { updatedAt: 'desc' },
        take: 50,
      }),
      prisma.groupMessage.findMany({
        where: {
          updatedAt: { gt },
          id: { notIn: freshIds },
          senderId: { notIn: blockedIds },
          group: { members: { some: { userId } } },
        },
        include: { sender: { select: USER_SELECT }, group: { select: { id: true, name: true } } },
        orderBy: { updatedAt: 'desc' },
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
      if (s.type === 'call-offer')
        return { id: s.id, event: 'incoming-call', data: { callerId: s.senderId, callerName: p.callerName, callerAvatar: p.callerAvatar, offer: p.offer, callType: p.callType } };
      if (s.type === 'call-answer')
        return { id: s.id, event: 'call-accepted', data: { answer: p.answer, receiverId: s.senderId } };
      if (s.type === 'call-end')
        return { id: s.id, event: 'call-ended', data: { endedBy: s.senderId } };
      return { id: s.id, event: 'ice-candidate', data: { candidate: p.candidate, fromUserId: s.senderId } };
    });

    return NextResponse.json({
      messages: messages
        .reverse()
        .map((m) => ({ message: m, senderId: m.senderId, timestamp: m.createdAt.getTime() })),
      // Field name is historical: poll consumers dispatch these as message-edited/-deleted
      changedMessages: changedMessages.reverse(),
      groupMessages: groupMessages.reverse(),
      changedGroupMessages: changedGroupMessages.reverse(),
      reactions: reactionPayload,
      callSignals: callSignalsOut,
      // Typing rides the same response so each tick is one round trip, not two.
      typing: typingUsers.get(userId) || null,
      unreadNotifications,
      unreadMessages,
      timestamp: Date.now() - POLL_SKEW_MS,
    });
  } catch (error) {
    console.error('Socket.IO polling error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
