export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/server-auth";
import prisma from "@/lib/prisma";
import { parseBody, updateBlogSchema } from "@/lib/validation";
import { isMissingTable, notProvisioned } from "@/lib/prisma-errors";

const authorSelect = {
  select: { id: true, name: true, username: true, avatar: true, department: true },
};

// GET /api/blogs/[id] — one blog with its comments
export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await getServerSession(req);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const blog = await prisma.blog.findUnique({
      where: { id: params.id },
      include: {
        author: authorSelect,
        comments: {
          include: { author: authorSelect },
          orderBy: { createdAt: "asc" },
          take: 200,
        },
        _count: { select: { comments: true } },
      },
    });

    if (!blog) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(blog);
  } catch (error) {
    if (isMissingTable(error)) return notProvisioned();
    console.error("Blog GET error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// PATCH /api/blogs/[id] — author-only edit
export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await getServerSession(req);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const blog = await prisma.blog.findUnique({
      where: { id: params.id },
      select: { authorId: true },
    });
    if (!blog) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (blog.authorId !== session.user.id) {
      return NextResponse.json({ error: "Only the author can edit" }, { status: 403 });
    }

    const parsed = await parseBody(req, updateBlogSchema);
    if (!parsed.ok) return parsed.response;

    const data: { title?: string; content?: string } = {};
    if (parsed.data.title !== undefined) {
      data.title = parsed.data.title;
    }
    if (parsed.data.content !== undefined) {
      data.content = parsed.data.content;
    }
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const updated = await prisma.blog.update({
      where: { id: params.id },
      data,
      include: { author: authorSelect, _count: { select: { comments: true } } },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (isMissingTable(error)) return notProvisioned();
    console.error("Blog PATCH error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// DELETE /api/blogs/[id] — author-only; comments cascade in the db
export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await getServerSession(req);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const blog = await prisma.blog.findUnique({
      where: { id: params.id },
      select: { authorId: true },
    });
    if (!blog) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (blog.authorId !== session.user.id) {
      return NextResponse.json({ error: "Only the author can delete" }, { status: 403 });
    }

    await prisma.blog.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (isMissingTable(error)) return notProvisioned();
    console.error("Blog DELETE error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
