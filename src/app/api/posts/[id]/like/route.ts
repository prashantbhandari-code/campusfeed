import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
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
    }

    const likesCount = await prisma.like.count({ where: { postId } });
    return NextResponse.json({ isLiked: true, likesCount });
  } catch (error) {
    console.error("Like error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
