import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import prisma from "@/lib/prisma";
import { sanitize } from "@/lib/sanitize";
import { parseBody, createForumReplySchema } from "@/lib/validation";

// Strip HTML tags to prevent stored XSS

export async function POST(req: NextRequest, { params }: { params: { postId: string } }) {
  try {
    const auth = await requireUser(req);
    if (!auth.ok) return auth.response;
    const session = auth.session;

    const parsed = await parseBody(req, createForumReplySchema);
    if (!parsed.ok) return parsed.response;
    const sanitizedContent = sanitize(parsed.data.content || "");
    if (!sanitizedContent) {
      return NextResponse.json({ error: "Content required" }, { status: 400 });
    }

    const reply = await prisma.forumReply.create({
      data: {
        postId: params.postId,
        authorId: session.user.id,
        content: sanitizedContent,
      },
    });

    return NextResponse.json(reply);
  } catch (error) {
    console.error("POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest, { params }: { params: { postId: string } }) {
  try {
    const auth = await requireUser(req);
    if (!auth.ok) return auth.response;
    const session = auth.session;

    const replies = await prisma.forumReply.findMany({
      where: { postId: params.postId },
      include: {
        author: { select: { id: true, name: true, username: true, avatar: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(replies);
  } catch (error) {
    console.error("GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
