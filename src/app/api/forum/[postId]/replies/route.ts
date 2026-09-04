import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: { postId: string } }) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const reply = await prisma.forumReply.create({
      data: {
        postId: params.postId,
        authorId: session.user.id,
        content: body.content,
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
