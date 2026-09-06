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
    const { emoji } = await req.json();
    if (!emoji) {
      return NextResponse.json({ error: "Emoji required" }, { status: 400 });
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
    });

    return NextResponse.json(reactions);
  } catch (error) {
    console.error("Reaction error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const reactions = await prisma.messageReaction.findMany({
      where: { messageId: params.id },
      include: { user: { select: { id: true, name: true, username: true } } },
    });
    return NextResponse.json(reactions);
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
