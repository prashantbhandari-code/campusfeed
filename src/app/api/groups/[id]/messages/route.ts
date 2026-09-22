export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAppwriteSession } from "@/lib/appwrite-server-auth";
import prisma from "@/lib/prisma";
import { sanitize } from "@/lib/sanitize";
import { emitToGroup } from "@/lib/socket";

const USER_SELECT = { id: true, name: true, username: true, avatar: true, verified: true } as const;

async function requireMember(req: Request, groupId: string) {
  const session = await getAppwriteSession(req);
  const userId = session?.user ? (session.user as any).id : null;
  if (!userId) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
  if (!membership) {
    return { error: NextResponse.json({ error: "Must be a member to view chat" }, { status: 403 }) };
  }
  return { userId };
}

// GET /api/groups/[id]/messages — last 50 messages, members only
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const { error } = await requireMember(req, params.id);
    if (error) return error;

    const messages = await prisma.groupMessage.findMany({
      where: { groupId: params.id },
      include: { sender: { select: USER_SELECT } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json(messages.reverse());
  } catch (error) {
    console.error("Group messages GET error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// POST /api/groups/[id]/messages — send a message, members only
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId, error } = await requireMember(req, params.id);
    if (error) return error;

    const body = await req.json();
    const content = sanitize(typeof body?.content === "string" ? body.content.trim() : "");
    if (!content) {
      return NextResponse.json({ error: "Content required" }, { status: 400 });
    }

    const message = await prisma.groupMessage.create({
      data: { content, groupId: params.id, senderId: userId },
      include: { sender: { select: USER_SELECT }, group: { select: { id: true, name: true } } },
    });

    // WebSocket deployments get it pushed to the room (no-op elsewhere —
    // the DB-backed poll in /api/socketio delivers it instead)
    emitToGroup(params.id, "new-group-message", message);

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    console.error("Group messages POST error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
