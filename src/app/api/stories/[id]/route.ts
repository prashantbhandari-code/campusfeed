export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import prisma from "@/lib/prisma";
import { parseBody, storyActionSchema } from "@/lib/validation";
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireUser(req);
    if (!auth.ok) return auth.response;
    const session = auth.session;
    const userId = session.user.id;
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
      isLiked: story.likes.some((l) => l.userId === userId),
      likeCount: story.likes.length,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST like/unlike or add comment
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireUser(req);
    if (!auth.ok) return auth.response;
    const session = auth.session;
    const userId = session.user.id;
    const parsed = await parseBody(req, storyActionSchema);
    if (!parsed.ok) return parsed.response;
    const body = parsed.data;

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

// DELETE story (owner only)
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireUser(req);
    if (!auth.ok) return auth.response;
    const session = auth.session;

    const story = await prisma.story.findUnique({ where: { id: params.id } });
    if (!story) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (story.authorId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await prisma.storyComment.deleteMany({ where: { storyId: params.id } });
    await prisma.storyLike.deleteMany({ where: { storyId: params.id } });
    await prisma.story.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
