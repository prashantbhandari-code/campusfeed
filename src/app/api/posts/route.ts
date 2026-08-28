export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = 10;
    const skip = (page - 1) * limit;

    let where: any = {};

    if (userId) {
      where.authorId = userId;
    } else {
      const following = await prisma.follow.findMany({
        where: { followerId: (session.user as any).id },
        select: { followingId: true },
      });
      const followingIds = following.map((f) => f.followingId);
      where.authorId = { in: [...followingIds, (session.user as any).id] };
    }

    const posts = await prisma.post.findMany({
      where,
      include: {
        author: { select: { id: true, name: true, username: true, avatar: true } },
        comments: {
          include: { author: { select: { id: true, name: true, username: true, avatar: true } } },
          orderBy: { createdAt: "desc" },
        },
        likes: { select: { userId: true } },
        saves: { select: { userId: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    });

    const postsWithMeta = posts.map((post) => ({
      ...post,
      isLiked: post.likes.some((l) => l.userId === (session.user as any).id),
      likesCount: post.likes.length,
      commentsCount: post.comments.length,
      isSaved: post.saves.some((s) => s.userId === (session.user as any).id),
      savesCount: post.saves.length,
    }));

    return NextResponse.json(postsWithMeta);
  } catch (error) {
    console.error("Get posts error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { content, images } = await req.json();

    if (!content && (!images || images.length === 0)) {
      return NextResponse.json({ error: "Post must have content or images" }, { status: 400 });
    }

    const post = await prisma.post.create({
      data: {
        content: content || null,
        images: JSON.stringify(images || []),
        authorId: (session.user as any).id,
      },
      include: {
        author: { select: { id: true, name: true, username: true, avatar: true } },
        likes: { select: { userId: true } },
        saves: { select: { userId: true } },
        comments: true,
      },
    });

    return NextResponse.json({
      ...post,
      isLiked: false,
      likesCount: 0,
      commentsCount: 0,
      isSaved: false,
      savesCount: 0,
    }, { status: 201 });
  } catch (error) {
    console.error("Create post error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
