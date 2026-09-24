export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAppwriteSession } from "@/lib/appwrite-server-auth";
import prisma from "@/lib/prisma";
import { emitToUser } from "@/lib/socket";
import { sendPush } from "@/lib/push";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAppwriteSession(req);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const followerId = (session.user as any).id;
    const followingId = params.id;

    const follow = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
    });

    // Check if they follow us back
    const theyFollowUs = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: followingId, followingId: followerId } },
    });

    return NextResponse.json({ isFollowing: !!follow, doesFollowYou: !!theyFollowUs });
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

    const followerId = (session.user as any).id;
    const followingId = params.id;

    if (followerId === followingId) {
      return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 });
    }

    const existing = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
    });

    if (existing) {
      await prisma.follow.delete({ where: { id: existing.id } });
      // Check mutual follow after unfollow
    const theyStillFollowUs = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: followingId, followingId: followerId } },
    });
    return NextResponse.json({ isFollowing: false, doesFollowYou: !!theyStillFollowUs });
    }

    await prisma.follow.create({ data: { followerId, followingId } });

    const fromUser = await prisma.user.findUnique({
      where: { id: followerId },
      select: { id: true, name: true, username: true, avatar: true },
    });

    // Deduplicate: only create if no recent follow notification exists
    const recentNotif = await prisma.notification.findFirst({
      where: {
        type: "follow",
        userId: followingId,
        fromUserId: followerId,
        createdAt: { gte: new Date(Date.now() - 60 * 1000) }, // last 1 min
      },
    });

    if (!recentNotif) {
      await prisma.notification.create({
        data: { type: "follow", userId: followingId, fromUserId: followerId },
      });
      void sendPush(followingId, {
        title: fromUser?.name || "Someone",
        body: "started following you",
        url: `/profile/${fromUser?.username || ""}`,
      });
    }

    emitToUser(followingId, "new-notification", {
      type: "follow",
      fromUser,
      createdAt: new Date(),
    });

        // Check if they follow us back
    const theyFollowUs = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: followingId, followingId: followerId } },
    });
    return NextResponse.json({ isFollowing: true, doesFollowYou: !!theyFollowUs });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
