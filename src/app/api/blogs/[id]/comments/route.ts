export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/server-auth";
import prisma from "@/lib/db/prisma";
import { parseBody, createBlogCommentSchema, commentActionSchema } from "@/lib/security/validation";
import { sendPush } from "@/lib/notifications/push";
import { isMissingTable, notProvisioned } from "@/lib/db/prisma-errors";

const authorSelect = {
  select: { id: true, name: true, username: true, avatar: true, department: true },
};

// POST /api/blogs/[id]/comments — comment on a blog; the blog's author is
// notified (bell + push), because a comment has no other surface they'd see.
export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await getServerSession(req);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const parsed = await parseBody(req, createBlogCommentSchema);
    if (!parsed.ok) return parsed.response;

    const content = parsed.data.content;
    const blog = await prisma.blog.findUnique({
      where: { id: params.id },
      select: { authorId: true, title: true },
    });
    if (!blog) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const comment = await prisma.blogComment.create({
      data: { content, blogId: params.id, authorId: userId },
      include: { author: authorSelect },
    });

    // Tell the blog's author — but never yourself for your own blog.
    if (blog.authorId !== userId) {
      try {
        await prisma.notification.create({
          data: {
            type: "blog_comment",
            userId: blog.authorId,
            fromUserId: userId,
            postId: params.id, // target ref: the blog id (column is a loose id slot)
          },
        });

        const name = session.user?.name || "Someone";
        // Fire-and-forget: push delivery must never fail the comment.
        void sendPush(blog.authorId, {
          title: "New comment",
          body: `${name} commented on "${blog.title}"`,
          url: `/blogs/${params.id}`,
        });
      } catch (error) {
        // A failed fan-out must not fail the comment that already exists.
        console.error("Blog comment notify error:", error);
      }
    }

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    if (isMissingTable(error)) return notProvisioned();
    console.error("Blog comments POST error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// DELETE /api/blogs/[id]/comments — remove your own comment
export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await getServerSession(req);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = await parseBody(req, commentActionSchema);
    if (!parsed.ok) return parsed.response;

    const comment = await prisma.blogComment.findUnique({
      where: { id: parsed.data.commentId },
      select: { authorId: true, blogId: true },
    });
    // Wrong blog id is treated as not-found, not as an ownership leak.
    if (!comment || comment.blogId !== params.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (comment.authorId !== session.user.id) {
      return NextResponse.json({ error: "Only the comment author can delete" }, { status: 403 });
    }

    await prisma.blogComment.delete({ where: { id: parsed.data.commentId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (isMissingTable(error)) return notProvisioned();
    console.error("Blog comments DELETE error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
