export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const currentUserId = (session?.user as any)?.id;
    const targetUserId = params.id;

    // Privacy check: can only see followers list if:
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
          error: "You can only see followers of mutual connections",
          restricted: true 
        }, { status: 403 });
      }
    }

    const followers = await prisma.follow.findMany({
      where: { followingId: targetUserId },
      include: {
        follower: {
          select: { id: true, name: true, username: true, avatar: true, department: true, batchYear: true },
        },
      },
      orderBy: { id: "desc" },
    });

    return NextResponse.json(followers.map((f: any) => f.follower));
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
