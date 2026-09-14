import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromCookieHeader } from '@/lib/session-token';

// In-memory store for demo - in production, use Redis or Appwrite Realtime
const messageQueues = new Map<string, Array<{ senderId: string; message: any; timestamp: number }>>();
const typingUsers = new Map<string, { senderId: string; senderName: string; timestamp: number }>();

// Cleanup old messages every 5 minutes
setInterval(() => {
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
  Array.from(messageQueues.entries()).forEach(([userId, messages]) => {
    const filtered = messages.filter((m: { timestamp: number }) => m.timestamp > fiveMinutesAgo);
    if (filtered.length === 0) {
      messageQueues.delete(userId);
    } else {
      messageQueues.set(userId, filtered);
    }
  });
  Array.from(typingUsers.entries()).forEach(([userId, typing]) => {
    if (typing.timestamp < fiveMinutesAgo) {
      typingUsers.delete(userId);
    }
  });
}, 60 * 1000);

// POST: Send a message or typing indicator
export async function POST(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const userId = getUserIdFromCookieHeader(cookieHeader);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, receiverId, groupId, data } = body;

    if (action === 'message' && receiverId) {
      // Queue message for receiver
      if (!messageQueues.has(receiverId)) {
        messageQueues.set(receiverId, []);
      }
      messageQueues.get(receiverId)!.push({
        senderId: userId,
        message: data,
        timestamp: Date.now(),
      });
      return NextResponse.json({ success: true });
    }

    if (action === 'group-message' && groupId) {
      // Queue for all group members (simplified - in production use Appwrite Realtime)
      return NextResponse.json({ success: true, note: 'Group messaging via Appwrite Realtime' });
    }

    if (action === 'typing' && receiverId) {
      typingUsers.set(receiverId, {
        senderId: userId,
        senderName: data?.senderName || 'User',
        timestamp: Date.now(),
      });
      return NextResponse.json({ success: true });
    }

    if (action === 'stop-typing' && receiverId) {
      typingUsers.delete(receiverId);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Socket.IO polling error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET: Poll for new messages
export async function GET(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const userId = getUserIdFromCookieHeader(cookieHeader);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const since = parseInt(url.searchParams.get('since') || '0');
    const type = url.searchParams.get('type') || 'messages';

    if (type === 'typing') {
      const typing = typingUsers.get(userId);
      return NextResponse.json({ typing: typing || null });
    }

    // Get pending messages
    const messages = messageQueues.get(userId) || [];
    const pendingMessages = messages.filter(m => m.timestamp > since);

    // Clear retrieved messages
    if (pendingMessages.length > 0) {
      messageQueues.set(userId, messages.filter(m => m.timestamp <= since));
    }

    return NextResponse.json({
      messages: pendingMessages,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Socket.IO polling error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
