export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAppwriteSession } from "@/lib/appwrite-server-auth";
import prisma from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAppwriteSession(req);
    const currentUserId = session?.user?.id;
    const targetUserId = params.id;

    // Privacy check: can only see following list if:
    // 1. It's your own profile, OR
    // 2. You follow them AND they follow you back (mutual followers)
    if (currentUserId && currentUserId !== targetUserId) {
      const iFollowThem = await prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: currentUserId, followingId: targetUserId } },
      });
      const theyFollowMe = await prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: targetUserId, followingId: currentUserId } },
      });

      if (!iFollowThem || !theyFollowMe) {
        return NextResponse.json({ 
          error: "You can only see following list of mutual connections",
          restricted: true 
        }, { status: 403 });
      }
    }

    const following = await prisma.follow.findMany({
      where: { followerId: targetUserId },
      include: {
        following: {
          select: { id: true, name: true, username: true, avatar: true, department: true, batchYear: true },
        },
      },
      orderBy: { id: "desc" },
      take: 500,
    });

    return NextResponse.json(following.map((f: any) => f.following));
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
