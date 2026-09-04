export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAppwriteSession } from "@/lib/appwrite-server-auth";
import prisma from "@/lib/prisma";

// GET story with likes and comments
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getAppwriteSession(req);
    const userId = (session?.user as any)?.id;
    const story = await prisma.story.findUnique({
      where: { id: params.id },
      include: {
        author: { select: { id: true, name: true, username: true, avatar: true } },
        likes: { select: { userId: true } },
        comments: {
          include: { user: { select: { id: true, name: true, username: true, avatar: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (!story) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({
      ...story,
      isLiked: userId ? story.likes.some((l) => l.userId === userId) : false,
      likeCount: story.likes.length,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST like/unlike or add comment
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getAppwriteSession(req);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = (session.user as any).id;
    const body = await req.json();

    if (body.action === "like") {
      const existing = await prisma.storyLike.findUnique({
        where: { userId_storyId: { userId, storyId: params.id } },
      });
      if (existing) {
        await prisma.storyLike.delete({ where: { id: existing.id } });
        return NextResponse.json({ liked: false });
      } else {
        await prisma.storyLike.create({ data: { userId, storyId: params.id } });
        return NextResponse.json({ liked: true });
      }
    }

    if (body.action === "comment" && body.content?.trim()) {
      const comment = await prisma.storyComment.create({
        data: { userId, storyId: params.id, content: body.content.trim() },
        include: { user: { select: { id: true, name: true, username: true, avatar: true } } },
      });
      return NextResponse.json(comment, { status: 201 });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
