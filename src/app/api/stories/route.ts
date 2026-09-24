export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAppwriteSession } from "@/lib/appwrite-server-auth";
import prisma from "@/lib/prisma";
import { getBlockedIds } from "@/lib/blocking";

export async function GET(req: Request) {
  try {
    const session = await getAppwriteSession(req);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const following = await prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    const followingIds = following.map((f) => f.followingId);
    const blockedIds = await getBlockedIds(userId);

    const stories = await prisma.story.findMany({
      where: {
        expiresAt: { gt: new Date() },
        authorId: { in: [...followingIds, userId], notIn: blockedIds },
      },
      select: {
        id: true,
        images: true,
        createdAt: true,
        expiresAt: true,
        authorId: true,
        author: { select: { id: true, name: true, username: true, avatar: true } },
        _count: { select: { likes: true, comments: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(stories);
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getAppwriteSession(req);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { images } = await req.json();
    if (!images || images.length === 0) {
      return NextResponse.json({ error: "Images required" }, { status: 400 });
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const story = await prisma.story.create({
      data: {
        images: JSON.stringify(images),
        authorId: (session.user as any).id,
        expiresAt,
      },
      select: {
        id: true,
        images: true,
        createdAt: true,
        expiresAt: true,
        authorId: true,
        author: { select: { id: true, name: true, username: true, avatar: true } },
        _count: { select: { likes: true, comments: true } },
      },
    });

    return NextResponse.json(story, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
