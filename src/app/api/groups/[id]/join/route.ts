export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import prisma from "@/lib/prisma";

// POST /api/groups/[id]/join — join a group
export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const auth = await requireUser(req);
    if (!auth.ok) return auth.response;
    const session = auth.session;

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

    // Membership insert + counter bump are atomic — separate statements
    // drift memberCount under concurrent joins.
    await prisma.$transaction([
      prisma.groupMember.create({
        data: { groupId, userId },
      }),
      prisma.group.update({
        where: { id: groupId },
        data: { memberCount: { increment: 1 } },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Join group error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// DELETE /api/groups/[id]/join — leave a group (transfers admin, deletes orphaned groups)
export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const auth = await requireUser(req);
    if (!auth.ok) return auth.response;
    const session = auth.session;

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

    // Membership delete + counter decrement are atomic (mirrors the join path
    // and members/[userId]) so memberCount can't drift under concurrent leaves.
    await prisma.$transaction([
      prisma.groupMember.delete({ where: { id: membership.id } }),
      prisma.group.update({
        where: { id: groupId },
        data: { memberCount: { decrement: 1 } },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Leave group error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
