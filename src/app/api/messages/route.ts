export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAppwriteSession } from "@/lib/appwrite-server-auth";
import prisma from "@/lib/prisma";
import { sanitize } from "@/lib/sanitize";
import { emitToUser } from "@/lib/socket";
import { getBlockedIds, isBlockedPair } from "@/lib/blocking";
import { sendPush } from "@/lib/push";
import { parseBody, sendMessageSchema } from "@/lib/validation";
import { withRateLimit } from "@/lib/rateLimit";

// Strip HTML tags to prevent stored XSS

export async function GET(req: Request) {
  try {
    const session = await getAppwriteSession(req);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Hide conversations with blocked users (either direction).
    // This route runs on every conversation-list render AND on every
    // new-message event — an unbounded scan of the user's whole history
    // was a latency bomb at scale. Unread counts stay exact because the
    // count query is NOT capped; only last-message previews can fall back
    // to "older than the window" for conversations idle beyond it.
    const blockedIds = await getBlockedIds(userId);
    const CONVERSATION_WINDOW = 500;
    const [conversations, unreadRows] = await Promise.all([
      prisma.message.findMany({
        where: { OR: [{ senderId: userId }, { receiverId: userId }] },
        include: {
          sender: { select: { id: true, name: true, username: true, avatar: true } },
          receiver: { select: { id: true, name: true, username: true, avatar: true } },
        },
        orderBy: { createdAt: "desc" },
        take: CONVERSATION_WINDOW,
      }),
      prisma.message.groupBy({
        by: ["senderId"],
        where: { receiverId: userId, read: false, senderId: { notIn: blockedIds } },
        _count: { _all: true },
      }),
    ]);
    const unreadBySender = new Map<string, number>(
      unreadRows.map((r) => [r.senderId, r._count._all])
    );

    const conversationMap = new Map<string, any>();
    conversations.forEach((msg) => {
      // Skip messages the viewer deleted for themselves
      const hiddenForMe = msg.senderId === userId ? msg.deletedForSender : msg.deletedForReceiver;
      if (hiddenForMe) return;
      const otherUserId = msg.senderId === userId ? msg.receiverId : msg.senderId;
      if (blockedIds.includes(otherUserId)) return;
      if (!conversationMap.has(otherUserId)) {
        conversationMap.set(otherUserId, {
          otherUser: msg.senderId === userId ? msg.receiver : msg.sender,
          lastMessage: msg,
          // Exact per-sender unread from the groupBy; the per-row fallback
          // below only applies to senders whose unread rows exist but whose
          // recent window is somehow empty (defensive — shouldn't happen).
          unread: unreadBySender.get(otherUserId) ?? 0,
        });
      } else {
        const existing = conversationMap.get(otherUserId);
        if (existing.unread === 0 && msg.receiverId === userId && !msg.read) {
          existing.unread = 1;
        }
      }
    });

    return NextResponse.json(Array.from(conversationMap.values()));
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export const POST = withRateLimit(
  async (req: Request) => {
  try {
    const session = await getAppwriteSession(req);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = await parseBody(req, sendMessageSchema);
    if (!parsed.ok) return parsed.response;
    const { receiverId, content, fileUrl, fileType, fileName, replyToId } = parsed.data;
    if (!content && !fileUrl) {
      return NextResponse.json({ error: "Content or file required" }, { status: 400 });
    }
    if (await isBlockedPair(session.user.id, receiverId)) {
      return NextResponse.json({ error: "You can't send messages to this user" }, { status: 403 });
    }

    // Reply target must be a message in this same conversation
    if (replyToId) {
      const parent = await prisma.message.findFirst({
        where: {
          id: replyToId,
          OR: [
            { senderId: session.user.id, receiverId },
            { senderId: receiverId, receiverId: session.user.id },
          ],
        },
        select: { id: true },
      });
      if (!parent) {
        return NextResponse.json({ error: "Invalid reply target" }, { status: 400 });
      }
    }

    const message = await prisma.message.create({
      data: {
        content: content ? sanitize(content) : "",
        senderId: session.user.id,
        receiverId,
        fileUrl: fileUrl || null,
        fileType: fileType || null,
        fileName: fileName || null,
        replyToId: replyToId || null,
      },
      include: {
        sender: { select: { id: true, name: true, username: true, avatar: true } },
        receiver: { select: { id: true, name: true, username: true, avatar: true } },
        replyTo: {
          select: {
            id: true,
            content: true,
            fileUrl: true,
            fileType: true,
            fileName: true,
            senderId: true,
            deletedForEveryone: true,
            sender: { select: { id: true, name: true, username: true, avatar: true } },
          },
        },
      },
    });

    // Message alerts belong to the Messages badge (conversation unread count),
    // not the notifications bell — no Notification row, no new-notification emit.
    emitToUser(receiverId, "new-message", message);

    // Push was never wired for DMs — recipients only learned about messages
    // when the app was open. Fire-and-forget: never delay or fail the send.
    void sendPush(receiverId, {
      title: message.sender?.name ? `Message from ${message.sender.name}` : "New message",
      body: message.content ? message.content.slice(0, 120) : message.fileName ? `📎 ${message.fileName}` : "Sent an attachment",
      url: `/messages/${message.senderId}`,
    }).catch(() => {});

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
  },
  { windowMs: 60000, maxRequests: 60 } // 60 sends per minute
);
