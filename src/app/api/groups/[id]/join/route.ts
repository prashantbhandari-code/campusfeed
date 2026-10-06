export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAppwriteSession } from "@/lib/appwrite-server-auth";
import prisma from "@/lib/prisma";

// POST /api/groups/[id]/join — join a group
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAppwriteSession(req);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const groupId = params.id;

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: { id: true },
    });
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const existing = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });

    if (existing) {
      return NextResponse.json({ error: "Already a member" }, { status: 400 });
    }

    await prisma.groupMember.create({
      data: { groupId, userId },
    });

    await prisma.group.update({
      where: { id: groupId },
      data: { memberCount: { increment: 1 } },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Join group error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// DELETE /api/groups/[id]/join — leave a group (transfers admin, deletes orphaned groups)
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAppwriteSession(req);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const groupId = params.id;

    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!membership) {
      return NextResponse.json({ success: true });
    }

    if (membership.role === "admin") {
      const remaining = await prisma.groupMember.count({ where: { groupId } });
      if (remaining <= 1) {
        // Last member out — the group has no one left, delete it (WhatsApp rule)
        await prisma.group.delete({ where: { id: groupId } });
        return NextResponse.json({ success: true, deleted: true });
      }
      // Transfer admin to the longest-standing member before leaving
      const successor = await prisma.groupMember.findFirst({
        where: { groupId, userId: { not: userId } },
        orderBy: { joinedAt: "asc" },
      });
      if (successor) {
        await prisma.groupMember.update({
          where: { id: successor.id },
          data: { role: "admin" },
        });
      }
    }

    await prisma.groupMember.delete({ where: { id: membership.id } });

    await prisma.group.update({
      where: { id: groupId },
      data: { memberCount: { decrement: 1 } },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Leave group error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
