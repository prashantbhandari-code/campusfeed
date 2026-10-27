import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/api-auth";
import prisma from "@/lib/db/prisma";
import { parseBody, createForumReplySchema } from "@/lib/security/validation";

export async function POST(req: NextRequest, props: { params: Promise<{ postId: string }> }) {
  const params = await props.params;
  try {
    const auth = await requireUser(req);
    if (!auth.ok) return auth.response;
    const session = auth.session;

    const parsed = await parseBody(req, createForumReplySchema);
    if (!parsed.ok) return parsed.response;
    const content = parsed.data.content;

    const reply = await prisma.forumReply.create({
      data: {
        postId: params.postId,
        authorId: session.user.id,
        content,
      },
    });

    return NextResponse.json(reply);
  } catch (error) {
    console.error("POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest, props: { params: Promise<{ postId: string }> }) {
  const params = await props.params;
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
