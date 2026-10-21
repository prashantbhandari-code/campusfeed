export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import prisma from "@/lib/prisma";
import { emitToUser } from "@/lib/socket";
import { getBlockedIds, isBlockedPair } from "@/lib/blocking";
import { sendPush } from "@/lib/push";
import { parseBody, sendMessageSchema } from "@/lib/validation";
import { withRateLimit } from "@/lib/rateLimit";

// Strip HTML tags to prevent stored XSS

export async function GET(req: Request) {
  try {
    const auth = await requireUser(req);
    if (!auth.ok) return auth.response;
    const session = auth.session;

    const userId = session.user.id;

    // Hide conversations with blocked users (either direction).
    const blockedIds = await getBlockedIds(userId);

    // Last message per conversation straight from Postgres (DISTINCT ON) —
    // replaces materializing up to 500 full rows (two user joins each) and
    // reducing in JS on every list render. The senderId/receiverId indexes
    // keep the inner scan cheap regardless of history size; unread counts
    // stay exact via the uncapped groupBy below.
    const lastRows = await prisma.$queryRaw<{ partner: string; id: string }[]>`
      SELECT DISTINCT ON (partner) partner, "id"
      FROM (
        SELECT "id", "createdAt",
               CASE WHEN "senderId" = ${userId} THEN "receiverId" ELSE "senderId" END AS partner
        FROM "messages"
        WHERE ("senderId" = ${userId} AND "deletedForSender" = false)
           OR ("receiverId" = ${userId} AND "deletedForReceiver" = false)
      ) t
      WHERE partner <> ALL(${blockedIds}::text[])
      ORDER BY partner, "createdAt" DESC
    `;

    const lastMessages = lastRows.length
      ? await prisma.message.findMany({
          where: { id: { in: lastRows.map((r) => r.id) } },
          include: {
            sender: { select: { id: true, name: true, username: true, avatar: true, lastSeen: true } },
            receiver: { select: { id: true, name: true, username: true, avatar: true, lastSeen: true } },
          },
        })
      : [];

    const unreadRows = await prisma.message.groupBy({
      by: ["senderId"],
      where: { receiverId: userId, read: false, senderId: { notIn: blockedIds } },
      _count: { _all: true },
    });
    const unreadBySender = new Map<string, number>(
      unreadRows.map((r) => [r.senderId, r._count._all])
    );
    const partnerById = new Map(lastRows.map((r) => [r.id, r.partner]));

    const conversationMap = new Map<string, any>();
    lastMessages
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .forEach((msg) => {
        const otherUserId = partnerById.get(msg.id);
        if (!otherUserId) return;
        conversationMap.set(otherUserId, {
          otherUser: msg.senderId === userId ? msg.receiver : msg.sender,
          lastMessage: msg,
          unread: unreadBySender.get(otherUserId) ?? 0,
        });
      });

    return NextResponse.json(Array.from(conversationMap.values()));
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export const POST = withRateLimit(
  async (req: Request) => {
  try {
    const auth = await requireUser(req);
    if (!auth.ok) return auth.response;
    const session = auth.session;

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
        content: content || "",
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
