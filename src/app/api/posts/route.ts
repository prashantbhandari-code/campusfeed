export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAppwriteSession } from "@/lib/appwrite-server-auth";
import prisma from "@/lib/prisma";
import { sanitize } from "@/lib/sanitize";
import { withRateLimit } from "@/lib/rateLimit";

// Simple HTML sanitizer — strip tags

export const GET = withRateLimit(async (req: Request) => {
  try {
    const session = await getAppwriteSession(req);
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
      select: {
        id: true,
        content: true,
        images: true,
        createdAt: true,
        authorId: true,
        author: { select: { id: true, name: true, username: true, avatar: true } },
        _count: { select: { likes: true, comments: true, saves: true } },
        likes: { where: { userId: (session.user as any).id }, select: { userId: true } },
        saves: { where: { userId: (session.user as any).id }, select: { userId: true } },
        comments: {
          select: {
            id: true,
            content: true,
            createdAt: true,
            author: { select: { id: true, name: true, username: true, avatar: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 3,
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    });

    const postsWithMeta = posts.map((post) => ({
      ...post,
      content: post.content ? sanitize(post.content) : null,
      isLiked: post.likes.length > 0,
      likesCount: post._count.likes,
      commentsCount: post._count.comments,
      isSaved: post.saves.length > 0,
      savesCount: post._count.saves,
    }));

    return NextResponse.json(postsWithMeta);
  } catch (error) {
    console.error("Get posts error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}, { windowMs: 60000, maxRequests: 120 }); // 120 reads per minute

export const POST = withRateLimit(async (req: Request) => {
  try {
    const session = await getAppwriteSession(req);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { content, images } = await req.json();

    // Sanitize content
    const sanitizedContent = content ? sanitize(content) : null;

    if (!sanitizedContent && (!images || images.length === 0)) {
      return NextResponse.json({ error: "Post must have content or images" }, { status: 400 });
    }

    // Limit content length
    if (sanitizedContent && sanitizedContent.length > 5000) {
      return NextResponse.json({ error: "Content too long (max 5000 characters)" }, { status: 400 });
    }

    // Limit images
    if (images && images.length > 10) {
      return NextResponse.json({ error: "Too many images (max 10)" }, { status: 400 });
    }

    const post = await prisma.post.create({
      data: {
        content: sanitizedContent || null,
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
}, { windowMs: 60000, maxRequests: 10 }); // 10 posts per minute
