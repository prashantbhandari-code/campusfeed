export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";
import { emitToUser } from "@/lib/socket";
import { parseBody, messageReactionSchema } from "@/lib/validation";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireUser(req);
    if (!auth.ok) return auth.response;
    const session = auth.session;

    const messageId = params.id;
    const parsed = await parseBody(req, messageReactionSchema);
    if (!parsed.ok) return parsed.response;
    const { emoji } = parsed.data;

    // Only the two conversation participants may react (or read reactions) —
    // mirrors the sender/receiver check in messages/[id].
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      select: { senderId: true, receiverId: true },
    });
    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }
    if (message.senderId !== session.user.id && message.receiverId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Toggle reaction: if exists, remove; if not, add
    const existing = await prisma.messageReaction.findUnique({
      where: { messageId_userId_emoji: { messageId, userId: session.user.id, emoji } },
    });

    if (existing) {
      await prisma.messageReaction.delete({ where: { id: existing.id } });
    } else {
      await prisma.messageReaction.create({
        data: { messageId, userId: session.user.id, emoji },
      });
    }

    // Return all reactions for this message
    const reactions = await prisma.messageReaction.findMany({
      where: { messageId },
      include: { user: { select: { id: true, name: true, username: true } } },
      take: 100,
    });

    // Bump the message's change marker so other devices' polls pick this up —
    // a removed reaction row can't be found by the poll's createdAt scan.
    await prisma.message.updateMany({
      where: { id: messageId },
      data: { updatedAt: new Date() },
    });

    // Push live update to both chat participants (WebSocket deployments;
    // on Vercel the polling fallback in /api/socketio delivers it instead)
    const payload = { messageId, reactions };
    emitToUser(message.senderId, "message-reaction", payload);
    if (message.receiverId !== message.senderId) {
      emitToUser(message.receiverId, "message-reaction", payload);
    }

    return NextResponse.json(reactions);
  } catch (error) {
    console.error("Reaction error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireUser(req);
    if (!auth.ok) return auth.response;
    const session = auth.session;
    const message = await prisma.message.findUnique({
      where: { id: params.id },
      select: { senderId: true, receiverId: true },
    });
    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }
    if (message.senderId !== session.user.id && message.receiverId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const reactions = await prisma.messageReaction.findMany({
      where: { messageId: params.id },
      include: { user: { select: { id: true, name: true, username: true } } },
      take: 100,
    });
    return NextResponse.json(reactions);
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
