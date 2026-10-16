import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import prisma from "@/lib/prisma";
import { getCourseMembership, canParticipateInCourse } from "@/lib/lms-auth";
import { parseBody, createForumPostSchema } from "@/lib/validation";

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const auth = await requireUser(req);
    if (!auth.ok) return auth.response;
    const session = auth.session;

    const parsed = await parseBody(req, createForumPostSchema);
    if (!parsed.ok) return parsed.response;
    const { title, content: postContent } = parsed.data;

    const membership = await getCourseMembership(params.id, session.user.id);
    if (!membership.courseExists) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }
    if (!canParticipateInCourse(membership)) {
      return NextResponse.json({ error: "You are not enrolled in this course" }, { status: 403 });
    }

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

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const auth = await requireUser(req);
    if (!auth.ok) return auth.response;
    const session = auth.session;

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
