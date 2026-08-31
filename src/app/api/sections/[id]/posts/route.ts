export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET /api/sections/[id]/posts — list posts in a section
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const posts = await prisma.sectionPost.findMany({
      where: { sectionId: params.id },
      include: {
        author: {
          select: { id: true, name: true, username: true, avatar: true, department: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json(posts);
  } catch (error) {
    console.error("Section posts GET error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// POST /api/sections/[id]/posts — create a post in a section
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const sectionId = params.id;

    // Check group membership
    const section = await prisma.section.findUnique({ where: { id: sectionId } });
    if (!section) {
      return NextResponse.json({ error: "Section not found" }, { status: 404 });
    }

    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: section.groupId, userId } },
    });
    if (!membership) {
      return NextResponse.json({ error: "Must be a member" }, { status: 403 });
    }

    const body = await req.json();
    const { content, images } = body;

    if (!content?.trim() && (!images || images.length === 0)) {
      return NextResponse.json({ error: "Content or images required" }, { status: 400 });
    }

    const post = await prisma.sectionPost.create({
      data: {
        content: content?.trim() || null,
        images: JSON.stringify(images || []),
        sectionId,
        authorId: userId,
      },
      include: {
        author: {
          select: { id: true, name: true, username: true, avatar: true, department: true },
        },
      },
    });

    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    console.error("Section posts POST error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
