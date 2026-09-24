export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAppwriteSession } from "@/lib/appwrite-server-auth";
import prisma from "@/lib/prisma";
import { sendPush } from "@/lib/push";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAppwriteSession(req);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const postId = params.id;
    const userId = (session.user as any).id;

    const existingLike = await prisma.like.findUnique({
      where: { postId_userId: { postId, userId } },
    });

    if (existingLike) {
      await prisma.like.delete({ where: { id: existingLike.id } });

      const post = await prisma.post.findUnique({ where: { id: postId } });
      if (post && post.authorId !== userId) {
        await prisma.notification.deleteMany({
          where: { type: "like", userId: post.authorId, fromUserId: userId, postId },
        });
      }

      const likesCount = await prisma.like.count({ where: { postId } });
      return NextResponse.json({ isLiked: false, likesCount });
    }

    await prisma.like.create({ data: { postId, userId } });

    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (post && post.authorId !== userId) {
      await prisma.notification.create({
        data: { type: "like", userId: post.authorId, fromUserId: userId, postId },
      });
      const from = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
      void sendPush(post.authorId, {
        title: from?.name || "Someone",
        body: "liked your post",
        url: `/posts/${postId}`,
      });
    }

    const likesCount = await prisma.like.count({ where: { postId } });
    return NextResponse.json({ isLiked: true, likesCount });
  } catch (error) {
    console.error("Like error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
