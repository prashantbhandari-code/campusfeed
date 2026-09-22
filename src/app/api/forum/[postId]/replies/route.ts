import { NextRequest, NextResponse } from "next/server";
import { getAppwriteSession } from "@/lib/appwrite-server-auth";
import prisma from "@/lib/prisma";
import { sanitize } from "@/lib/sanitize";

// Strip HTML tags to prevent stored XSS

export async function POST(req: NextRequest, { params }: { params: { postId: string } }) {
  try {
    const session = await getAppwriteSession(req);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const sanitizedContent = sanitize(body.content || "");
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
