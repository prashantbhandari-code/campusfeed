export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/server-auth";
import prisma from "@/lib/prisma";
import { sanitize } from "@/lib/sanitize";
import { parseBody, createGroupPostSchema } from "@/lib/validation";
import { getBlockedIds } from "@/lib/blocking";

// Strip HTML tags to prevent stored XSS

// GET /api/groups/[id]/posts — list posts in a group
export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await getServerSession(req);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const blockedIds = await getBlockedIds(session.user.id);
    const posts = await prisma.groupPost.findMany({
      where: { groupId: params.id, authorId: { notIn: blockedIds } },
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
    console.error("Group posts GET error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// POST /api/groups/[id]/posts — create a post in a group
export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
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
      return NextResponse.json({ error: "Must be a member to post" }, { status: 403 });
    }

    // Announcement mode: only admins may post when allowMemberPosts is off
    if (membership.role !== "admin") {
      const group = await prisma.group.findUnique({
        where: { id: groupId },
        select: { allowMemberPosts: true },
      });
      if (group && !group.allowMemberPosts) {
        return NextResponse.json(
          { error: "Only admins can post in this group" },
          { status: 403 }
        );
      }
    }

    const parsed = await parseBody(req, createGroupPostSchema);
    if (!parsed.ok) return parsed.response;
    const { content, images } = parsed.data;

    if (!content?.trim() && (!images || images.length === 0)) {
      return NextResponse.json({ error: "Content or images required" }, { status: 400 });
    }

    const post = await prisma.groupPost.create({
      data: {
        content: content ? sanitize(content) : null,
        images: JSON.stringify(images || []),
        groupId,
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
    console.error("Group posts POST error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
