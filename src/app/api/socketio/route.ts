import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromCookieHeader } from '@/lib/auth/session-token';
import prisma from '@/lib/db/prisma';
import { collectDelta, SKEW_MS } from '@/lib/realtime/collect-delta';
import { setTyping, clearTyping, freshTypingFor, setGroupTyping, clearGroupTyping, freshGroupTypingFor } from '@/lib/realtime/typing-store';
import { parseBody, socketioSchema } from '@/lib/security/validation';
import { Prisma } from '@prisma/client';
import { addSignal, startFlush, stopFlush } from '@/lib/calls/signal-batcher';

// JSON polling fallback for the realtime transport. The primary client
// transport is SSE (/api/realtime); this route stays for environments where
// EventSource is unavailable and for typing/call-signal POSTs.
//
// GET returns the same delta shape the SSE stream emits, so one client
// dispatcher handles both.

// POST: typing indicators (messages go through /api/messages → DB)
export async function POST(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const userId = getUserIdFromCookieHeader(cookieHeader);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const parsed = await parseBody(request, socketioSchema);
    if (!parsed.ok) return parsed.response;
    const body = parsed.data;
    const { action, receiverId } = body;

    if (action === 'typing' && receiverId) {
      // Display name comes from our DB, never the body — a spoofable
      // senderName let any client type as any user.
      const sender = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true },
      });
      setTyping(receiverId, userId, sender?.name ?? '');
      return NextResponse.json({ success: true });
    }

    if (action === 'stop-typing' && receiverId) {
      clearTyping(receiverId, userId);
      return NextResponse.json({ success: true });
    }

    // Group chat typing indicators
    if (action === 'group-typing' && receiverId) {
      // receiverId here is actually the groupId for group typing
      const sender = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true },
      });
      setGroupTyping(receiverId, userId, sender?.name ?? '');
      return NextResponse.json({ success: true });
    }

    if (action === 'group-stop-typing' && receiverId) {
      clearGroupTyping(receiverId, userId);
      return NextResponse.json({ success: true });
    }

    if (action === 'join-group' || action === 'leave-group') {
      // Rooms exist only in WebSocket mode; both REST transports derive group
      // access from the DB on every request, so there is nothing to track here.
      return NextResponse.json({ success: true });
    }

    // WebRTC call signaling relay for the REST transports (server.ts covers
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
      const targetId = body[targetKey as 'receiverId' | 'callerId' | 'otherUserId' | 'targetUserId'];
      if (!targetId) return NextResponse.json({ error: 'Missing target' }, { status: 400 });

      // Use batched writes for ICE candidates (high volume); direct write for others.
      if (action === 'ice-candidate') {
        startFlush(targetId);
        addSignal(targetId, action, body as unknown as Prisma.InputJsonValue, userId);
      } else {
        await prisma.callSignal.create({
          data: {
            senderId: userId,
            receiverId: targetId,
            type: action,
            payload: body as unknown as Prisma.InputJsonValue,
          },
        });
      }

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

// GET: one JSON delta — the same payload the SSE stream emits per frame.
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
      return NextResponse.json({ typing: freshTypingFor(userId) });
    }

    if (type === 'group-typing') {
      const groupId = url.searchParams.get('groupId');
      if (!groupId) return NextResponse.json({ error: 'groupId required' }, { status: 400 });
      return NextResponse.json({ typing: freshGroupTypingFor(groupId) });
    }

    const delta = await collectDelta(userId, since, Date.now());

    return NextResponse.json({
      ...delta,
      // Typing rides the same response so each tick is one round trip, not two.
      // Array of everyone currently typing to this user; the client diffs it
      // against the previous tick to raise user-typing / user-stop-typing.
      typing: freshTypingFor(userId),
      timestamp: delta.nextSince,
    });
  } catch (error) {
    console.error('Socket.IO polling error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
