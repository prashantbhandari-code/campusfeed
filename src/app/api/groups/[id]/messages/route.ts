export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/server-auth";
import prisma from "@/lib/prisma";
import { sanitize } from "@/lib/sanitize";
import { emitToGroup } from "@/lib/socket";
import { withRateLimit } from "@/lib/rateLimit";
import { getBlockedIds } from "@/lib/blocking";
import { parseBody, groupMessageSchema } from "@/lib/validation";
import { USER_SELECT } from "@/lib/user";

async function requireMember(req: Request, groupId: string) {
  const session = await getServerSession(req);
  const userId = session?.user ? session.user.id : null;
  if (!userId) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
  if (!membership) {
    return { error: NextResponse.json({ error: "Must be a member to view chat" }, { status: 403 }) };
  }
  return { userId };
}

// GET /api/groups/[id]/messages — last 50 messages, members only (marks read)
export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const { userId, error } = await requireMember(req, params.id);
    if (error) return error;

    // Blocked members' messages stay invisible in the shared thread.
    // Fresh loads hide tombstones; the poll still delivers them so devices
    // that already rendered the message learn about the deletion.
    const blockedIds = await getBlockedIds(userId);
    const messages = await prisma.groupMessage.findMany({
      where: {
        groupId: params.id,
        senderId: { notIn: blockedIds },
        deletedForEveryone: false,
      },
      include: { sender: { select: USER_SELECT } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    // Opening the chat marks it read for the unread badge
    await prisma.groupMember.updateMany({
      where: { groupId: params.id, userId },
      data: { lastReadAt: new Date() },
    });

    return NextResponse.json(messages.reverse());
  } catch (error) {
    console.error("Group messages GET error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// POST /api/groups/[id]/messages — send text or an attachment, members only
export const POST = withRateLimit(async (req: Request, props: { params: Promise<{ id: string }> }) => {
  const params = await props.params;
  try {
    const { userId, error } = await requireMember(req, params.id);
    if (error) return error;

    const parsed = await parseBody(req, groupMessageSchema);
    if (!parsed.ok) return parsed.response;
    const content = sanitize((parsed.data.content || "").trim());
    const fileUrl = parsed.data.fileUrl || null;
    const fileType = parsed.data.fileType || null;
    const fileName = parsed.data.fileName || null;

    if (!content && !fileUrl) {
      return NextResponse.json({ error: "Content or file required" }, { status: 400 });
    }
    if (content.length > 5000) {
      return NextResponse.json({ error: "Message too long (max 5000 characters)" }, { status: 400 });
    }

    const message = await prisma.groupMessage.create({
      data: { content, fileUrl, fileType, fileName, groupId: params.id, senderId: userId },
      include: { sender: { select: USER_SELECT }, group: { select: { id: true, name: true } } },
    });

    // Sender has by definition read up to their own message
    await prisma.groupMember.updateMany({
      where: { groupId: params.id, userId },
      data: { lastReadAt: new Date() },
    });

    // WebSocket deployments get it pushed to the room (no-op elsewhere —
    // the DB-backed poll in /api/socketio delivers it instead)
    emitToGroup(params.id, "new-group-message", message);

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    console.error("Group messages POST error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}, { windowMs: 60000, maxRequests: 60 }); // 60 sends per minute

// DELETE /api/groups/[id]/messages — remove a message (sender or group admin)
export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const { userId, error } = await requireMember(req, params.id);
    if (error) return error;

    let body: { messageId?: string } = {};
    try {
      body = await req.json();
    } catch { /* fall through to 400 below */ }
    if (!body.messageId) {
      return NextResponse.json({ error: "messageId required" }, { status: 400 });
    }

    const message = await prisma.groupMessage.findUnique({ where: { id: body.messageId } });
    if (!message || message.groupId !== params.id) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: params.id, userId } },
    });
    const canDelete = message.senderId === userId || membership?.role === "admin";
    if (!canDelete) {
      return NextResponse.json({ error: "You can only delete your own messages" }, { status: 403 });
    }

    // Soft delete: a tombstone syncs to every device via the poll (updatedAt
    // bumps); a hard delete could never be delivered to rows already loaded.
    const tombstone = await prisma.groupMessage.update({
      where: { id: message.id },
      data: {
        content: "",
        fileUrl: null,
        fileType: null,
        fileName: null,
        deletedForEveryone: true,
      },
    });
    emitToGroup(params.id, "group-message-deleted", { messageId: message.id, groupId: params.id });

    return NextResponse.json({ success: true, deletedForEveryone: tombstone.deletedForEveryone });
  } catch (error) {
    console.error("Group messages DELETE error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
