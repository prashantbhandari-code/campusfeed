export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/server-auth";
import prisma from "@/lib/db/prisma";
import { sendPush } from "@/lib/notifications/push";
import { pushTarget } from "@/lib/notifications/notification-target";
import { isBlockedPair } from "@/lib/security/blocking";
import { withRateLimit } from "@/lib/security/rateLimit";
import { checkUserRateLimit } from "@/lib/security/rate-limit";

export const POST = withRateLimit(
  async (req: Request, props: { params: Promise<{ id: string }> }) => {
    const params = await props.params;
    try {
      const session = await getServerSession(req);
      if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const { success } = await checkUserRateLimit(session.user.id, "like");
      if (!success) {
        return NextResponse.json({ error: "Rate limited. Please wait before liking again." }, { status: 429 });
      }

      const postId = params.id;
      const userId = session.user.id;

      const post = await prisma.post.findUnique({
        where: { id: postId },
        select: { authorId: true },
      });
      if (!post) {
        return NextResponse.json({ error: "Post not found" }, { status: 404 });
      }
      if (await isBlockedPair(userId, post.authorId)) {
        return NextResponse.json({ error: "You can't interact with this post" }, { status: 403 });
      }

      const existingLike = await prisma.like.findUnique({
        where: { postId_userId: { postId, userId } },
      });

      if (existingLike) {
        await prisma.like.delete({ where: { id: existingLike.id } });

        if (post.authorId !== userId) {
          await prisma.notification.deleteMany({
            where: { type: "like", userId: post.authorId, fromUserId: userId, postId },
          });
        }

        const likesCount = await prisma.like.count({ where: { postId } });
        return NextResponse.json({ isLiked: false, likesCount });
      }

      await prisma.like.create({ data: { postId, userId } });

      if (post.authorId !== userId) {
        await prisma.notification.create({
          data: { type: "like", userId: post.authorId, fromUserId: userId, postId },
        });
        const from = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
        void sendPush(post.authorId, {
          title: from?.name || "Someone",
          body: "liked your post",
          // No post-detail page exists — land on the feed with the post
          // highlighted, same as the in-app notification row.
          url: pushTarget({ type: "like", postId }) || "/feed",
        });
      }

      const likesCount = await prisma.like.count({ where: { postId } });
      return NextResponse.json({ isLiked: true, likesCount });
    } catch (error) {
      console.error("Like error:", error);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  },
  { windowMs: 60000, maxRequests: 120 } // 120 like toggles per minute
);
