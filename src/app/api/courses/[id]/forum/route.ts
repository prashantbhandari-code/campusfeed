import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions) as any;
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
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions) as any;
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
}
