import { NextRequest, NextResponse } from "next/server";
import { getAppwriteSession } from "@/lib/appwrite-server-auth";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getAppwriteSession(req);
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

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getAppwriteSession(req);
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

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getAppwriteSession(req);
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
