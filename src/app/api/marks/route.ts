export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/api-auth";
import { getCourseMembership, canManageCourse } from "@/lib/auth/lms-auth";
import { parseBody, upsertMarkSchema } from "@/lib/security/validation";
import prisma from "@/lib/db/prisma";

/**
 * GET /api/marks?courseId=…
 *
 * Teacher/admin only: the enrolled roster plus every recorded mark for the
 * course, which is what the grading screen renders.
 */
export async function GET(req: Request) {
  try {
    const auth = await requireUser(req);
    if (!auth.ok) return auth.response;

    const courseId = new URL(req.url).searchParams.get("courseId");
    if (!courseId) {
      return NextResponse.json({ error: "courseId is required" }, { status: 400 });
    }

    const membership = await getCourseMembership(courseId, auth.session.user.id);
    if (!membership.courseExists) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }
    if (!canManageCourse(membership)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [course, enrollments, marks] = await Promise.all([
      prisma.course.findUnique({
        where: { id: courseId },
        select: { id: true, name: true, code: true, semester: true },
      }),
      prisma.courseEnrollment.findMany({
        where: { courseId, status: "active" },
        select: {
          role: true,
          student: {
            select: {
              id: true,
              name: true,
              username: true,
              avatar: true,
              rollNumber: true,
              section: true,
            },
          },
        },
        orderBy: { student: { name: "asc" } },
      }),
      prisma.mark.findMany({
        where: { courseId },
        select: { studentId: true, examType: true, score: true, maxScore: true, comment: true },
      }),
    ]);

    const students = enrollments.map(({ student, role }) => {
      const own = marks.filter((m) => m.studentId === student.id);
      const byType: Record<string, { score: number; maxScore: number; comment: string | null }> = {};
      for (const m of own) byType[m.examType] = { score: m.score, maxScore: m.maxScore, comment: m.comment };
      return { ...student, role, marks: byType };
    });

    return NextResponse.json({ course, students });
  } catch (error) {
    console.error("GET /api/marks error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/marks — record or update one mark.
 *
 * Teacher/admin only (`canManageCourse`), and the target must be actively
 * enrolled in that course, so a teacher of course A cannot write a mark for a
 * student who is not on it. The upsert key is (courseId, studentId, examType),
 * so re-submitting a mark corrects it instead of duplicating it.
 */
export async function POST(req: Request) {
  try {
    const auth = await requireUser(req);
    if (!auth.ok) return auth.response;

    const parsed = await parseBody(req, upsertMarkSchema);
    if (!parsed.ok) return parsed.response;
    const { courseId, studentId, examType, score, maxScore, comment } = parsed.data;

    const membership = await getCourseMembership(courseId, auth.session.user.id);
    if (!membership.courseExists) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }
    if (!canManageCourse(membership)) {
      return NextResponse.json(
        { error: "Only the course teacher can record marks" },
        { status: 403 }
      );
    }

    const enrollment = await prisma.courseEnrollment.findUnique({
      where: { courseId_studentId: { courseId, studentId } },
      select: { id: true, status: true },
    });
    if (!enrollment || enrollment.status !== "active") {
      return NextResponse.json(
        { error: "That student is not enrolled in this course" },
        { status: 404 }
      );
    }

    const effectiveMax = maxScore ?? 100;
    if (score > effectiveMax) {
      return NextResponse.json(
        { error: "Score cannot exceed the maximum score" },
        { status: 400 }
      );
    }

    const mark = await prisma.mark.upsert({
      where: { courseId_studentId_examType: { courseId, studentId, examType } },
      update: { score, maxScore: effectiveMax, comment: comment ?? null, markedBy: auth.session.user.id },
      create: {
        courseId,
        studentId,
        examType,
        score,
        maxScore: effectiveMax,
        comment: comment ?? null,
        markedBy: auth.session.user.id,
      },
      select: { id: true, studentId: true, examType: true, score: true, maxScore: true },
    });

    return NextResponse.json({ mark });
  } catch (error) {
    console.error("POST /api/marks error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
