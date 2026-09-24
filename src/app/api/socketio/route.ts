import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromCookieHeader } from '@/lib/session-token';
import prisma from '@/lib/prisma';
import { collectDelta, SKEW_MS } from '@/lib/realtime/collect-delta';
import { setTyping, clearTyping, freshTypingFor } from '@/lib/realtime/typing-store';

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

    const body = await request.json();
    const { action, receiverId, senderName } = body;

    if (action === 'typing' && receiverId) {
      setTyping(receiverId, userId, senderName);
      return NextResponse.json({ success: true });
    }

    if (action === 'stop-typing' && receiverId) {
      clearTyping(receiverId, userId);
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
