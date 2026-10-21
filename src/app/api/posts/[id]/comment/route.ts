export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/server-auth";
import prisma from "@/lib/prisma";
import { sendPush } from "@/lib/push";
import { pushTarget } from "@/lib/notification-target";
import { getBlockedIds, isBlockedPair } from "@/lib/blocking";
import { withRateLimit } from "@/lib/rateLimit";
import { parseBody, createCommentSchema, editCommentSchema, commentActionSchema } from "@/lib/validation";

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await getServerSession(req);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const blockedIds = await getBlockedIds(userId);

    const comments = await prisma.comment.findMany({
      where: {
        postId: params.id,
        authorId: { notIn: blockedIds },
      },
      include: { author: { select: { id: true, name: true, username: true, avatar: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return NextResponse.json(comments);
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export const POST = withRateLimit(
  async (req: Request, props: { params: Promise<{ id: string }> }) => {
    const params = await props.params;
    try {
      const session = await getServerSession(req);
      if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const userId = session.user.id;

      const post = await prisma.post.findUnique({ where: { id: params.id } });
      if (!post) {
        return NextResponse.json({ error: "Post not found" }, { status: 404 });
      }
      if (await isBlockedPair(userId, post.authorId)) {
        return NextResponse.json({ error: "You can't comment on this post" }, { status: 403 });
      }

      const parsed = await parseBody(req, createCommentSchema);
      if (!parsed.ok) return parsed.response;
      const { content } = parsed.data;

      const comment = await prisma.comment.create({
        data: {
          content,
          postId: params.id,
          authorId: userId,
        },
        include: { author: { select: { id: true, name: true, username: true, avatar: true } } },
      });

      if (post.authorId !== userId) {
        await prisma.notification.create({
          data: {
            type: "comment",
            userId: post.authorId,
            fromUserId: userId,
            postId: params.id,
          },
        });
        void sendPush(post.authorId, {
          title: comment.author?.name || "Someone",
          body: `commented: ${content.slice(0, 80)}`,
          // No post-detail page exists — land on the feed with the post
          // highlighted, same as the in-app notification row.
          url: pushTarget({ type: "comment", postId: params.id }) || "/feed",
        });
      }

      return NextResponse.json(comment, { status: 201 });
    } catch (error) {
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  },
  { windowMs: 60000, maxRequests: 30 } // 30 comments per minute
);

/** Edit your own comment. body { commentId, content } */
export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await getServerSession(req);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const parsed = await parseBody(req, editCommentSchema);
    if (!parsed.ok) return parsed.response;
    const { commentId, content } = parsed.data;

    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment || comment.postId !== params.id) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }
    if (comment.authorId !== userId) {
      return NextResponse.json({ error: "You can only edit your own comments" }, { status: 403 });
    }
    if (content === comment.content) {
      return NextResponse.json({ error: "No changes" }, { status: 400 });
    }

    const updated = await prisma.comment.update({
      where: { id: commentId },
      data: { content, editedAt: new Date() },
      include: { author: { select: { id: true, name: true, username: true, avatar: true } } },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** Delete a comment — allowed for the comment author or the post author. body { commentId } */
export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await getServerSession(req);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const parsedDel = await parseBody(req, commentActionSchema);
    if (!parsedDel.ok) return parsedDel.response;
    const { commentId } = parsedDel.data;

    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment || comment.postId !== params.id) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    const post = await prisma.post.findUnique({
      where: { id: params.id },
      select: { authorId: true },
    });
    const isCommentAuthor = comment.authorId === userId;
    const isPostAuthor = post?.authorId === userId;
    if (!isCommentAuthor && !isPostAuthor) {
      return NextResponse.json(
        { error: "You can only delete your own comments" },
        { status: 403 }
      );
    }

    await prisma.comment.delete({ where: { id: commentId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
