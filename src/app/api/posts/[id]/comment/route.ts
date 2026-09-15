export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAppwriteSession } from "@/lib/appwrite-server-auth";
import prisma from "@/lib/prisma";

// Strip HTML tags to prevent stored XSS
function sanitize(input: string): string {
  return input.replace(/<[^>]*>/g, "").trim();
}

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const comments = await prisma.comment.findMany({
      where: { postId: params.id },
      include: { author: { select: { id: true, name: true, username: true, avatar: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(comments);
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAppwriteSession(req);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { content } = await req.json();
    if (!content) {
      return NextResponse.json({ error: "Content required" }, { status: 400 });
    }

    const sanitizedContent = sanitize(content);
    if (!sanitizedContent) {
      return NextResponse.json({ error: "Content required" }, { status: 400 });
    }

    const comment = await prisma.comment.create({
      data: {
        content: sanitizedContent,
        postId: params.id,
        authorId: (session.user as any).id,
      },
      include: { author: { select: { id: true, name: true, username: true, avatar: true } } },
    });

    const post = await prisma.post.findUnique({ where: { id: params.id } });
    if (post && post.authorId !== (session.user as any).id) {
      await prisma.notification.create({
        data: {
          type: "comment",
          userId: post.authorId,
          fromUserId: (session.user as any).id,
          postId: params.id,
        },
      });
    }

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
