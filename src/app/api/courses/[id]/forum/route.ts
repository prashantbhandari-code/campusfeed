import { NextRequest, NextResponse } from "next/server";
import { getAppwriteSession } from "@/lib/appwrite-server-auth";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getAppwriteSession(req);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { title, content: postContent } = body;

    const post = await prisma.forumPost.create({
      data: {
        courseId: params.id,
        authorId: session.user.id,
        title,
        content: postContent,
      },
    });

    return NextResponse.json(post);
  } catch (error) {
    console.error("POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getAppwriteSession(req);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const posts = await prisma.forumPost.findMany({
      where: { courseId: params.id },
      include: {
        author: { select: { id: true, name: true, username: true, avatar: true } },
        _count: { select: { replies: true } },
      },
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json(posts);
  } catch (error) {
    console.error("GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
