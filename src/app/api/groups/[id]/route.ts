export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET /api/groups/[id] — get group details
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;

    const group = await prisma.group.findUnique({
      where: { id: params.id },
      include: {
        createdBy: { select: { id: true, name: true, username: true, avatar: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, username: true, avatar: true, department: true } },
          },
          orderBy: { joinedAt: "desc" },
          take: 20,
        },
        _count: { select: { members: true, posts: true } },
      },
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const isMember = group.members.some((m) => m.userId === userId);

    return NextResponse.json({
      ...group,
      isMember,
      memberCount: group._count.members,
      postCount: group._count.posts,
      _count: undefined,
    });
  } catch (error) {
    console.error("Group detail error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
