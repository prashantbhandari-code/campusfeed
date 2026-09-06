export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAppwriteSession } from "@/lib/appwrite-server-auth";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getAppwriteSession(req);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const messageId = params.id;
    const userId = session.user.id;

    // Mark all messages from the other user as read
    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    // Only mark if the current user is the receiver
    if (message.receiverId === userId) {
      await prisma.message.updateMany({
        where: {
          senderId: message.senderId,
          receiverId: userId,
          read: false,
        },
        data: { read: true, readAt: new Date() },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Mark read error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
