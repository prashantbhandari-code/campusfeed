export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/server-auth";
import prisma from "@/lib/db/prisma";
import { parseBody, createBlogSchema } from "@/lib/security/validation";
import { getBlockedIds } from "@/lib/security/blocking";
import { isMissingTable, notProvisioned } from "@/lib/db/prisma-errors";

const authorSelect = {
  select: { id: true, name: true, username: true, avatar: true, department: true },
};

// GET /api/blogs — newest blogs first, with author and comment counts
export async function GET(req: Request) {
  try {
    const session = await getServerSession(req);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const blockedIds = await getBlockedIds(session.user.id);
    const blogs = await prisma.blog.findMany({
      where: { authorId: { notIn: blockedIds } },
      include: {
        author: authorSelect,
        _count: { select: { comments: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json(blogs);
  } catch (error) {
    if (isMissingTable(error)) return notProvisioned();
    console.error("Blogs GET error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// POST /api/blogs — publish a blog
export async function POST(req: Request) {
  try {
    const session = await getServerSession(req);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = await parseBody(req, createBlogSchema);
    if (!parsed.ok) return parsed.response;
    const { title, content } = parsed.data;

    // Validation schema already strips HTML and validates non-empty —
    // the parsed data is already clean.
    const blog = await prisma.blog.create({
      data: {
        title,
        content,
        authorId: session.user.id,
      },
      include: {
        author: authorSelect,
        _count: { select: { comments: true } },
      },
    });

    return NextResponse.json(blog, { status: 201 });
  } catch (error) {
    if (isMissingTable(error)) return notProvisioned();
    console.error("Blogs POST error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
