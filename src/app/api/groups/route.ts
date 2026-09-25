export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAppwriteSession } from "@/lib/appwrite-server-auth";
import prisma from "@/lib/prisma";
import { parseBody, createGroupSchema } from "@/lib/validation";

// GET /api/groups — list all groups with membership info
export async function GET(req: Request) {
  try {
    const session = await getAppwriteSession(req);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type"); // department, batch, class, custom, null=all
    const query = searchParams.get("q") || "";
    const department = searchParams.get("department"); // filter by viewer's own department
    const batchYear = searchParams.get("batchYear"); // filter by viewer's own batch

    const where: any = {};
    if (type) where.type = type;
    if (department) where.department = department;
    if (batchYear) where.batchYear = parseInt(batchYear);
    if (query) {
      where.OR = [
        { name: { contains: query } },
        { description: { contains: query } },
        { department: { contains: query } },
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
      take: 100,
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
    const session = await getAppwriteSession(req);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const parsed = await parseBody(req, createGroupSchema);
    if (!parsed.ok) return parsed.response;
    const { name, description, type, department, batchYear, section, allowMemberPosts } = parsed.data;

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: "Group name is required" }, { status: 400 });
    }
    if (name.trim().length > 80) {
      return NextResponse.json({ error: "Group name is too long (max 80 characters)" }, { status: 400 });
    }
    if (type === "class" && !department) {
      return NextResponse.json({ error: "Class groups need a department" }, { status: 400 });
    }

    const group = await prisma.group.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        type: type || "custom",
        department: department || null,
        batchYear: batchYear || null,
        section: section?.trim() || null,
        allowMemberPosts: allowMemberPosts !== false,
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
