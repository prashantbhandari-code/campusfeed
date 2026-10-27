import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/server-auth";
import prisma from "@/lib/db/prisma";

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await getServerSession(req);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const courseId = params.id;
    const userId = session.user.id;

    const existing = await prisma.courseEnrollment.findUnique({
      where: { courseId_studentId: { courseId, studentId: userId } }
    });
    if (existing) return NextResponse.json({ error: "Already enrolled" }, { status: 400 });

    const enrollment = await prisma.courseEnrollment.create({
      data: { courseId, studentId: userId, role: "student", status: "active" }
    });



    return NextResponse.json(enrollment);
  } catch (error) {
    console.error("POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await getServerSession(req);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await prisma.courseEnrollment.delete({
      where: { courseId_studentId: { courseId: params.id, studentId: session.user.id } }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await getServerSession(req);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const enrollments = await prisma.courseEnrollment.findMany({
      where: { courseId: params.id, status: "active" },
      include: { student: { select: { id: true, name: true, username: true, avatar: true } } }
    });
    const isEnrolled = enrollments.some((e: any) => e.studentId === session.user.id);
    return NextResponse.json({ enrollments, isEnrolled, count: enrollments.length });
  } catch (error) {
    console.error("GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
