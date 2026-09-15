export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAppwriteSession } from "@/lib/appwrite-server-auth";
import prisma from "@/lib/prisma";
import { emitToUser } from "@/lib/socket";

// Strip HTML tags to prevent stored XSS
function sanitize(input: string): string {
  return input.replace(/<[^>]*>/g, "").trim();
}

export async function GET(req: Request) {
  try {
    const session = await getAppwriteSession(req);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;

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
      const otherUserId = msg.senderId === userId ? msg.receiverId : msg.senderId;
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

export async function POST(req: Request) {
  try {
    const session = await getAppwriteSession(req);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { receiverId, content, fileUrl, fileType, fileName } = await req.json();
    if (!receiverId) {
      return NextResponse.json({ error: "Receiver required" }, { status: 400 });
    }
    if (!content && !fileUrl) {
      return NextResponse.json({ error: "Content or file required" }, { status: 400 });
    }

    const message = await prisma.message.create({
      data: {
        content: content ? sanitize(content) : "",
        senderId: (session.user as any).id,
        receiverId,
        fileUrl: fileUrl || null,
        fileType: fileType || null,
        fileName: fileName || null,
      },
      include: {
        sender: { select: { id: true, name: true, username: true, avatar: true } },
        receiver: { select: { id: true, name: true, username: true, avatar: true } },
      },
    });

    await prisma.notification.create({
      data: {
        type: "message",
        userId: receiverId,
        fromUserId: (session.user as any).id,
      },
    });

    // Emit real-time events
    emitToUser(receiverId, "new-message", message);
    emitToUser(receiverId, "new-notification", {
      type: "message",
      fromUser: message.sender,
      createdAt: message.createdAt,
    });

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
