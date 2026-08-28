export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET /api/groups — list all groups with membership info
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type"); // department, batch, custom, null=all
    const query = searchParams.get("q") || "";

    const where: any = {};
    if (type) where.type = type;
    if (query) {
      where.OR = [
        { name: { contains: query } },
        { description: { contains: query } },
      ];
    }

    const groups = await prisma.group.findMany({
      where,
      include: {
        createdBy: { select: { id: true, name: true, avatar: true } },
        members: {
          where: { userId },
          select: { id: true },
        },
        _count: { select: { members: true, posts: true } },
      },
      orderBy: { memberCount: "desc" },
    });

    const result = groups.map((g) => ({
      ...g,
      isMember: g.members.length > 0,
      memberCount: g._count.members,
      postCount: g._count.posts,
      members: undefined,
      _count: undefined,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Groups GET error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// POST /api/groups — create a new group
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await req.json();
    const { name, description, type, department, batchYear } = body;

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: "Group name is required" }, { status: 400 });
    }

    const group = await prisma.group.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        type: type || "custom",
        department: department || null,
        batchYear: batchYear || null,
        createdById: userId,
        memberCount: 1,
      },
    });

    // Auto-join the creator as admin
    await prisma.groupMember.create({
      data: { groupId: group.id, userId, role: "admin" },
    });

    return NextResponse.json(group, { status: 201 });
  } catch (error) {
    console.error("Groups POST error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
