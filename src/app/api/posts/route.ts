export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/server-auth";
import prisma from "@/lib/db/prisma";
import { withRateLimit } from "@/lib/security/rateLimit";
import { checkUserRateLimit } from "@/lib/security/rate-limit";
import { getBlockedIds } from "@/lib/security/blocking";
import { parseBody, createPostSchema } from "@/lib/security/validation";

export const GET = withRateLimit(async (req: Request) => {
  try {
    const session = await getServerSession(req);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = 10;
    const skip = (page - 1) * limit;

    const where: any = {};

    // Blocking applies to every feed mode: own posts, saved, and following
    const blockedIds = await getBlockedIds(session.user.id);
    if (blockedIds.length > 0) {
      where.AND = [{ authorId: { notIn: blockedIds } }];
    }

    if (searchParams.get("saved")) {
      // Saved-posts view: everything the current user has bookmarked
      where.saves = { some: { userId: session.user.id } };
    } else if (userId) {
      where.authorId = userId;
    } else {
      const following = await prisma.follow.findMany({
        where: { followerId: session.user.id },
        select: { followingId: true },
      });
      const followingIds = following.map((f) => f.followingId);
      where.authorId = { in: [...followingIds, session.user.id] };
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
        likes: { where: { userId: session.user.id }, select: { userId: true } },
        saves: { where: { userId: session.user.id }, select: { userId: true } },
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
      content: post.content,
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
    const session = await getServerSession(req);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { success } = await checkUserRateLimit(session.user.id, "post");
    if (!success) {
      return NextResponse.json({ error: "Rate limited. Please wait before posting again." }, { status: 429 });
    }

    const parsed = await parseBody(req, createPostSchema);
    if (!parsed.ok) return parsed.response;
    const { content, images } = parsed.data;

    if (!content?.trim() && (!images || images.length === 0)) {
      return NextResponse.json({ error: "Post must have content or images" }, { status: 400 });
    }

    // Limit content length (schema handles HTML stripping)
    if (content && content.length > 5000) {
      return NextResponse.json({ error: "Content too long (max 5000 characters)" }, { status: 400 });
    }

    // Limit images
    if (images && images.length > 10) {
      return NextResponse.json({ error: "Too many images (max 10)" }, { status: 400 });
    }

    const post = await prisma.post.create({
      data: {
        content: content || null,
        images: JSON.stringify(images || []),
        authorId: session.user.id,
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
