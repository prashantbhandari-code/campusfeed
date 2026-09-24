export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAppwriteSession } from "@/lib/appwrite-server-auth";
import prisma from "@/lib/prisma";
import { sanitize } from "@/lib/sanitize";
import { emitToUser } from "@/lib/socket";
import { getBlockedIds, isBlockedPair } from "@/lib/blocking";
import { withRateLimit } from "@/lib/rateLimit";

// Strip HTML tags to prevent stored XSS

export async function GET(req: Request) {
  try {
    const session = await getAppwriteSession(req);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // Hide conversations with blocked users (either direction)
    const blockedIds = await getBlockedIds(userId);
    const conversations = await prisma.message.findMany({
      where: { OR: [{ senderId: userId }, { receiverId: userId }] },
      include: {
        sender: { select: { id: true, name: true, username: true, avatar: true } },
        receiver: { select: { id: true, name: true, username: true, avatar: true } },
      },
      orderBy: { createdAt: "desc" },
    });

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
          unread: msg.receiverId === userId && !msg.read ? 1 : 0,
        });
      } else {
        const existing = conversationMap.get(otherUserId);
        if (msg.receiverId === userId && !msg.read) {
          existing.unread += 1;
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

    const { receiverId, content, fileUrl, fileType, fileName, replyToId } = await req.json();
    if (!receiverId) {
      return NextResponse.json({ error: "Receiver required" }, { status: 400 });
    }
    if (!content && !fileUrl) {
      return NextResponse.json({ error: "Content or file required" }, { status: 400 });
    }
    if (await isBlockedPair((session.user as any).id, receiverId)) {
      return NextResponse.json({ error: "You can't send messages to this user" }, { status: 403 });
    }

    // Reply target must be a message in this same conversation
    if (replyToId) {
      const parent = await prisma.message.findFirst({
        where: {
          id: replyToId,
          OR: [
            { senderId: (session.user as any).id, receiverId },
            { senderId: receiverId, receiverId: (session.user as any).id },
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
        senderId: (session.user as any).id,
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

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
  },
  { windowMs: 60000, maxRequests: 60 } // 60 sends per minute
);
