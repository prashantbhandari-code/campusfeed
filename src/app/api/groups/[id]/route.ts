export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/server-auth";
import prisma from "@/lib/prisma";

// GET /api/groups/[id] — get group details
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(req);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const [group, myMembership] = await Promise.all([
      prisma.group.findUnique({
        where: { id: params.id },
        include: {
          createdBy: { select: { id: true, name: true, username: true, avatar: true } },
          members: {
            include: {
              user: { select: { id: true, name: true, username: true, avatar: true, department: true } },
            },
            orderBy: { joinedAt: "desc" },
            take: 100,
          },
          _count: { select: { members: true, posts: true } },
        },
      }),
      // Own membership — can't rely on the top-100 member slice
      prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId: params.id, userId } },
      }),
    ]);

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // Unread = others' messages newer than my last-read marker
    const unreadCount = myMembership
      ? await prisma.groupMessage.count({
          where: {
            groupId: params.id,
            senderId: { not: userId },
            createdAt: { gt: myMembership.lastReadAt || new Date(0) },
          },
        })
      : 0;

    return NextResponse.json({
      ...group,
      isMember: !!myMembership,
      myRole: myMembership?.role || null,
      unreadCount,
      memberCount: group._count.members,
      postCount: group._count.posts,
      _count: undefined,
    });
  } catch (error) {
    console.error("Group detail error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// PATCH /api/groups/[id] — admin updates settings (announcement mode, name, etc.)
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(req);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: params.id, userId } },
    });
    if (membership?.role !== "admin") {
      return NextResponse.json({ error: "Only admins can change group settings" }, { status: 403 });
    }

    const body = await req.json();
    const data: any = {};
    if (typeof body.allowMemberPosts === "boolean") data.allowMemberPosts = body.allowMemberPosts;
    if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim().slice(0, 80);
    if (typeof body.description === "string") data.description = body.description.trim() || null;
    if (typeof body.section === "string") data.section = body.section.trim() || null;
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No valid settings provided" }, { status: 400 });
    }

    const updated = await prisma.group.update({ where: { id: params.id }, data });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Group settings error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// DELETE /api/groups/[id] — admin deletes the group (cascades members/posts/messages)
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(req);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: params.id, userId } },
    });
    if (membership?.role !== "admin") {
      return NextResponse.json({ error: "Only admins can delete the group" }, { status: 403 });
    }

    await prisma.group.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Group delete error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
