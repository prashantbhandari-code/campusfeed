export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/server-auth";
import prisma from "@/lib/prisma";

// GET /api/groups/[id]/sections — list sections in a group
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(req);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sections = await prisma.section.findMany({
      where: { groupId: params.id },
      include: {
        createdBy: { select: { id: true, name: true, avatar: true } },
        _count: { select: { posts: true } },
      },
      orderBy: { order: "asc" },
    });

    return NextResponse.json(sections);
  } catch (error) {
    console.error("Sections GET error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// POST /api/groups/[id]/sections — create a section
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(req);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const groupId = params.id;

    // Check membership
    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!membership) {
      return NextResponse.json({ error: "Must be a member" }, { status: 403 });
    }

    const body = await req.json();
    const { name, description, icon, color } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Name required" }, { status: 400 });
    }

    // Get next order
    const lastSection = await prisma.section.findFirst({
      where: { groupId },
      orderBy: { order: "desc" },
    });

    const section = await prisma.section.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        icon: icon || null,
        color: color || null,
        groupId,
        order: (lastSection?.order || 0) + 1,
        createdById: userId,
      },
      include: {
        createdBy: { select: { id: true, name: true, avatar: true } },
        _count: { select: { posts: true } },
      },
    });

    return NextResponse.json(section, { status: 201 });
  } catch (error) {
    console.error("Sections POST error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
