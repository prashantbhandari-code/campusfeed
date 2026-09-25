export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAppwriteSession } from "@/lib/appwrite-server-auth";
import prisma from "@/lib/prisma";

async function requireGroupAdmin(groupId: string, userId: string) {
  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
  return membership?.role === "admin";
}

/**
 * PATCH /api/groups/[id]/members/[userId] — change a member's role.
 * body { role: "admin" | "member" }
 */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string; userId: string } }
) {
  try {
    const session = await getAppwriteSession(req);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const callerId = session.user.id;

    if (!(await requireGroupAdmin(params.id, callerId))) {
      return NextResponse.json({ error: "Only admins can change roles" }, { status: 403 });
    }
    if (callerId === params.userId) {
      return NextResponse.json({ error: "Change your own role from the leave flow" }, { status: 400 });
    }

    const target = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: params.id, userId: params.userId } },
    });
    if (!target) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const body = await req.json();
    const role = body.role === "admin" ? "admin" : "member";

    if (target.role === "admin" && role === "member") {
      // Never allow demoting the last admin
      const adminCount = await prisma.groupMember.count({
        where: { groupId: params.id, role: "admin" },
      });
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: "The group must keep at least one admin — promote someone else first" },
          { status: 400 }
        );
      }
    }

    await prisma.groupMember.update({
      where: { id: target.id },
      data: { role },
    });

    return NextResponse.json({ success: true, role });
  } catch (error) {
    console.error("Member role error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

/** DELETE /api/groups/[id]/members/[userId] — admin kicks a member. */
export async function DELETE(
  req: Request,
  { params }: { params: { id: string; userId: string } }
) {
  try {
    const session = await getAppwriteSession(req);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const callerId = session.user.id;

    if (!(await requireGroupAdmin(params.id, callerId))) {
      return NextResponse.json({ error: "Only admins can remove members" }, { status: 403 });
    }
    if (callerId === params.userId) {
      return NextResponse.json({ error: "Use Leave group instead" }, { status: 400 });
    }

    const target = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: params.id, userId: params.userId } },
    });
    if (!target) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    if (target.role === "admin") {
      const adminCount = await prisma.groupMember.count({
        where: { groupId: params.id, role: "admin" },
      });
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: "Can't remove the last admin" },
          { status: 400 }
        );
      }
    }

    await prisma.$transaction([
      prisma.groupMember.delete({ where: { id: target.id } }),
      prisma.group.update({
        where: { id: params.id },
        data: { memberCount: { decrement: 1 } },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Member kick error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
