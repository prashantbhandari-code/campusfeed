export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAppwriteSession } from "@/lib/appwrite-server-auth";
import prisma from "@/lib/prisma";
import { sanitize } from "@/lib/sanitize";
import { emitToUser } from "@/lib/socket";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAppwriteSession(req);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const otherUserId = params.id;

    // Add pagination support
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    const conversationFilter = {
      OR: [
        { senderId: userId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: userId },
      ],
    };

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where: {
          AND: [
            conversationFilter,
            // Hide messages the viewer deleted for themselves
            {
              NOT: {
                OR: [
                  { senderId: userId, deletedForSender: true },
                  { senderId: otherUserId, deletedForReceiver: true },
                ],
              },
            },
          ],
        },
        include: {
          sender: { select: { id: true, name: true, username: true, avatar: true } },
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
          reactions: { include: { user: { select: { id: true, name: true, username: true } } } },
        },
        orderBy: { createdAt: "asc" },
        skip,
        take: limit,
      }),
      prisma.message.count({
        where: {
          AND: [
            conversationFilter,
            {
              NOT: {
                OR: [
                  { senderId: userId, deletedForSender: true },
                  { senderId: otherUserId, deletedForReceiver: true },
                ],
              },
            },
          ],
        },
      }),
    ]);

    await prisma.message.updateMany({
      where: { senderId: otherUserId, receiverId: userId, read: false },
      data: { read: true },
    });

    return NextResponse.json({ messages, total, page, hasMore: skip + messages.length < total });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** Edit a message's text (own text messages only, like WhatsApp). */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAppwriteSession(req);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = (session.user as any).id;

    const message = await prisma.message.findUnique({ where: { id: params.id } });
    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }
    if (message.senderId !== userId) {
      return NextResponse.json({ error: "You can only edit your own messages" }, { status: 403 });
    }
    if (message.deletedForEveryone) {
      return NextResponse.json({ error: "Message was deleted" }, { status: 400 });
    }
    if (!message.content) {
      return NextResponse.json({ error: "Attachments can't be edited" }, { status: 400 });
    }

    const { content } = await req.json();
    const sanitized = content ? sanitize(content) : "";
    if (!sanitized) {
      return NextResponse.json({ error: "Message can't be empty" }, { status: 400 });
    }
    if (sanitized.length > 5000) {
      return NextResponse.json({ error: "Message too long (max 5000 characters)" }, { status: 400 });
    }
    if (sanitized === message.content) {
      return NextResponse.json({ error: "No changes" }, { status: 400 });
    }

    const updated = await prisma.message.update({
      where: { id: params.id },
      data: { content: sanitized, editedAt: new Date() },
      include: {
        sender: { select: { id: true, name: true, username: true, avatar: true } },
        replyTo: { select: { id: true, content: true, senderId: true, deletedForEveryone: true } },
      },
    });

    const payload = { messageId: updated.id, content: updated.content, editedAt: updated.editedAt };
    emitToUser(message.senderId, "message-edited", payload);
    if (message.receiverId !== message.senderId) {
      emitToUser(message.receiverId, "message-edited", payload);
    }

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * Delete a message.
 *   body { scope: "everyone" } → unsend: content cleared, both sides see a tombstone.
 *   body { scope: "me" }       → hides it only for the caller.
 */
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAppwriteSession(req);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = (session.user as any).id;

    const message = await prisma.message.findUnique({ where: { id: params.id } });
    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }
    if (message.senderId !== userId && message.receiverId !== userId) {
      return NextResponse.json({ error: "Not part of this conversation" }, { status: 403 });
    }

    let body: { scope?: string } = {};
    try {
      body = await req.json();
    } catch { /* no body defaults below */ }
    const scope = body.scope === "me" ? "me" : "everyone";

    if (scope === "everyone") {
      // Only the sender can unsend for both sides (WhatsApp rule)
      if (message.senderId !== userId) {
        return NextResponse.json(
          { error: "You can only delete this message for yourself" },
          { status: 403 }
        );
      }
      if (message.deletedForEveryone) {
        return NextResponse.json({ error: "Already deleted" }, { status: 400 });
      }

      const tombstone = await prisma.message.update({
        where: { id: params.id },
        data: {
          content: "",
          fileUrl: null,
          fileType: null,
          fileName: null,
          deletedForEveryone: true,
        },
        select: { id: true, senderId: true, receiverId: true, deletedForEveryone: true },
      });

      await prisma.messageReaction.deleteMany({ where: { messageId: params.id } });

      const payload = { messageId: tombstone.id };
      emitToUser(message.senderId, "message-deleted", payload);
      if (message.receiverId !== message.senderId) {
        emitToUser(message.receiverId, "message-deleted", payload);
      }

      return NextResponse.json({ success: true, scope });
    }

    // scope === "me": flag the caller's side; GET filters it out for them
    const data =
      message.senderId === userId ? { deletedForSender: true } : { deletedForReceiver: true };
    await prisma.message.update({ where: { id: params.id }, data });
    return NextResponse.json({ success: true, scope });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
