export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/api-auth";
import prisma from "@/lib/db/prisma";

/**
 * Everything the student dashboard needs, in one round trip.
 *
 * Deliberately aggregated server-side: the LMS page used to fetch a full course
 * roster per enrolled course just to read a count, which is O(courses × roster).
 * This does a fixed five queries regardless of how many subjects a student has.
 *
 * Also returns students with no enrolments at all — the dashboard needs to say
 * "you are not enrolled yet" rather than render an empty shell with no reason.
 */
export async function GET(req: Request) {
  try {
    const auth = await requireUser(req);
    if (!auth.ok) return auth.response;
    const userId = auth.session.user.id;

    const profile = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        username: true,
        avatar: true,
        rollNumber: true,
        section: true,
        currentSemester: true,
        department: true,
        batchYear: true,
        email: true,
        collegeEmail: true,
        phone: true,
      },
    });
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const enrollments = await prisma.courseEnrollment.findMany({
      where: { studentId: userId, status: "active" },
      select: {
        role: true,
        course: {
          select: {
            id: true,
            name: true,
            code: true,
            credits: true,
            semester: true,
            department: true,
            creator: { select: { name: true } },
          },
        },
      },
    });

    const courseIds = enrollments.map((e) => e.course.id);

    if (courseIds.length === 0) {
      return NextResponse.json({
        profile,
        subjects: [],
        summary: {
          subjects: 0,
          credits: 0,
          attendancePercentage: null,
          assignmentsTotal: 0,
          assignmentsPending: 0,
          marksRecorded: 0,
        },
      });
    }

    const [attendanceCounts, marks, assignments] = await Promise.all([
      prisma.attendance.groupBy({
        by: ["courseId", "status"],
        where: { studentId: userId, courseId: { in: courseIds } },
        _count: { _all: true },
      }),
      prisma.mark.findMany({
        where: { studentId: userId, courseId: { in: courseIds } },
        select: { courseId: true, examType: true, score: true, maxScore: true, comment: true },
      }),
      prisma.assignment.findMany({
        where: { module: { courseId: { in: courseIds } } },
        select: {
          id: true,
          title: true,
          dueDate: true,
          maxScore: true,
          module: { select: { courseId: true } },
          submissions: {
            where: { studentId: userId },
            select: { id: true, status: true, score: true, submittedAt: true },
          },
        },
        orderBy: { dueDate: "asc" },
        take: 200,
      }),
    ]);

    const attendanceByCourse = new Map<string, Record<string, number>>();
    for (const row of attendanceCounts) {
      const bucket = attendanceByCourse.get(row.courseId) ?? {};
      bucket[row.status] = row._count._all;
      attendanceByCourse.set(row.courseId, bucket);
    }

    let attendanceTotalAll = 0;
    let attendancePresentAll = 0;
    let credits = 0;
    let assignmentsPending = 0;

    const subjects = enrollments
      .map(({ course, role }) => {
        credits += course.credits;

        const att = attendanceByCourse.get(course.id) ?? {};
        const present = att.present ?? 0;
        const absent = att.absent ?? 0;
        const late = att.late ?? 0;
        const excused = att.excused ?? 0;
        const total = present + absent + late + excused;
        // "late" counts as attended; "excused" is neutral and left out of the
        // denominator so an approved absence can't lower the percentage.
        const counted = present + absent + late;
        attendanceTotalAll += counted;
        attendancePresentAll += present + late;

        const subjectMarks = marks.filter((m) => m.courseId === course.id);
        const markMap: Record<string, { score: number; maxScore: number; percentage: number; comment: string | null }> = {};
        for (const m of subjectMarks) {
          markMap[m.examType] = {
            score: m.score,
            maxScore: m.maxScore,
            percentage: m.maxScore > 0 ? Math.round((m.score / m.maxScore) * 100) : 0,
            comment: m.comment,
          };
        }

        const subjectAssignments = assignments
          .filter((a) => a.module.courseId === course.id)
          .map((a) => {
            const submission = a.submissions[0] ?? null;
            return {
              id: a.id,
              title: a.title,
              dueDate: a.dueDate,
              maxScore: a.maxScore,
              submitted: Boolean(submission),
              status: submission?.status ?? null,
              score: submission?.score ?? null,
              submittedAt: submission?.submittedAt ?? null,
            };
          });

        const pending = subjectAssignments.filter((a) => !a.submitted).length;
        assignmentsPending += pending;

        return {
          id: course.id,
          name: course.name,
          code: course.code,
          credits: course.credits,
          semester: course.semester,
          department: course.department,
          teacher: course.creator?.name ?? null,
          role,
          attendance: {
            present,
            absent,
            late,
            excused,
            total,
            percentage: counted > 0 ? Math.round(((present + late) / counted) * 100) : null,
          },
          marks: {
            internal: markMap.internal ?? null,
            mid_sem: markMap.mid_sem ?? null,
            end_sem: markMap.end_sem ?? null,
          },
          assignments: subjectAssignments,
          assignmentsPending: pending,
        };
      })
      .sort((a, b) => a.code.localeCompare(b.code));

    return NextResponse.json({
      profile,
      subjects,
      summary: {
        subjects: subjects.length,
        credits,
        attendancePercentage:
          attendanceTotalAll > 0
            ? Math.round((attendancePresentAll / attendanceTotalAll) * 100)
            : null,
        assignmentsTotal: assignments.length,
        assignmentsPending,
        marksRecorded: marks.length,
      },
    });
  } catch (error) {
    console.error("Student overview error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
