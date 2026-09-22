import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromCookieHeader } from '@/lib/session-token';
import prisma from '@/lib/prisma';

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

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Socket.IO polling error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET: Poll for new messages / reactions / typing state
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

    // Newest-first + take 50 so a first poll (since=0) can't skip recent
    // messages behind a full page of older history.
    const [messages, groupMessages, rawReactions] = await Promise.all([
      prisma.message.findMany({
        where: { receiverId: userId, createdAt: { gt } },
        include: { sender: { select: USER_SELECT }, receiver: { select: USER_SELECT } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.groupMessage.findMany({
        where: {
          createdAt: { gt },
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
    ]);

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

    return NextResponse.json({
      messages: messages
        .reverse()
        .map((m) => ({ message: m, senderId: m.senderId, timestamp: m.createdAt.getTime() })),
      groupMessages: groupMessages.reverse(),
      reactions: reactionPayload,
      timestamp: Date.now() - POLL_SKEW_MS,
    });
  } catch (error) {
    console.error('Socket.IO polling error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
