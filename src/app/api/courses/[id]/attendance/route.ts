import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/api-auth";
import prisma from "@/lib/db/prisma";
import { getCourseMembership, canManageCourse, canParticipateInCourse } from "@/lib/auth/lms-auth";
import { parseBody, markAttendanceSchema } from "@/lib/security/validation";

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const auth = await requireUser(req);
    if (!auth.ok) return auth.response;
    const session = auth.session;

    const courseId = params.id;
    const parsed = await parseBody(req, markAttendanceSchema);
    if (!parsed.ok) return parsed.response;
    const { studentId: bodyStudentId, status, date, notes } = parsed.data;

    // Marking someone else is a teacher/admin action; the client gates this
    // behind isTeacher but the route is what actually enforces it.
    const targetStudentId = bodyStudentId || session.user.id;
    const membership = await getCourseMembership(courseId, session.user.id);
    if (!membership.courseExists) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // Checking *yourself* in still requires being on the course. Without this
    // any authenticated user could mark themselves "present" in any course by
    // posting its id, which quietly corrupts attendance stats.
    if (!canParticipateInCourse(membership)) {
      return NextResponse.json(
        { error: "You must be enrolled in this course to mark attendance" },
        { status: 403 }
      );
    }

    if (targetStudentId !== session.user.id) {
      if (!canManageCourse(membership)) {
        return NextResponse.json(
          { error: "Only the course teacher can mark attendance for others" },
          { status: 403 }
        );
      }
      // Don't create attendance rows for people who aren't on the course.
      const targetEnrollment = await prisma.courseEnrollment.findUnique({
        where: { courseId_studentId: { courseId, studentId: targetStudentId } },
        select: { id: true },
      });
      if (!targetEnrollment) {
        return NextResponse.json(
          { error: "That student is not enrolled in this course" },
          { status: 404 }
        );
      }
    }

    const attendance = await prisma.attendance.upsert({
      where: {
        courseId_studentId_date: {
          courseId,
          studentId: targetStudentId,
          date: date ? new Date(date) : new Date()
        }
      },
      update: { status: status || "present", notes, markedBy: session.user.id },
      create: {
        courseId,
        studentId: targetStudentId,
        status: status || "present",
        date: date ? new Date(date) : new Date(),
        notes,
        markedBy: session.user.id
      }
    });

    return NextResponse.json(attendance);
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

    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId") || session.user.id;
    // Viewing another student's attendance record is teacher/admin only.
    if (studentId !== session.user.id) {
      const membership = await getCourseMembership(params.id, session.user.id);
      if (!canManageCourse(membership)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    const month = searchParams.get("month");
    const year = searchParams.get("year");

    const where: any = { courseId: params.id, studentId };
    if (month && year) {
      const start = new Date(parseInt(year), parseInt(month) - 1, 1);
      const end = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
      where.date = { gte: start, lte: end };
    }

    const records = await prisma.attendance.findMany({ where, orderBy: { date: "desc" } });

    const total = records.length;
    const present = records.filter((r: any) => r.status === "present").length;
    const absent = records.filter((r: any) => r.status === "absent").length;
    const late = records.filter((r: any) => r.status === "late").length;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

    return NextResponse.json({ records, stats: { total, present, absent, late, percentage } });
  } catch (error) {
    console.error("GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
