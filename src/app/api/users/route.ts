export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAppwriteSession } from "@/lib/appwrite-server-auth";
import prisma from "@/lib/prisma";
import { getBlockedIds } from "@/lib/blocking";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";
    const userId = searchParams.get("userId");

    const session = await getAppwriteSession(req);
    const currentUserId = session?.user?.id;
    if (!currentUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Blocked users never appear in search or profile lookups
    const blockedIds = await getBlockedIds(currentUserId);

    let where: any = {};
    // Exclude current user and blocked users from results
    where.id = { notIn: [currentUserId, ...blockedIds] };

  if (userId) {
      // Direct profile lookup: blocked pair → treat as nonexistent
      if (blockedIds.includes(userId)) {
        return NextResponse.json([]);
      }
      where.id = userId;
    } else if (query) {
      where.OR = [
        { name: { contains: query } },
        { username: { contains: query } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        username: true,
        avatar: true,
        bio: true,
        department: true,
        batchYear: true,
        rollNumber: true,
        collegeEmail: true,
        _count: { select: { followers: true, following: true, posts: true } },
      },
      take: userId ? 1 : 20,
    });

    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
