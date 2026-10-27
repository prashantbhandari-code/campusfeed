import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from "@/lib/auth/api-auth";
import prisma from '@/lib/db/prisma';
import { getCourseMembership, canManageCourse } from '@/lib/auth/lms-auth';
import { parseBody, createAssignmentSchema } from '@/lib/security/validation';

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const auth = await requireUser(req);
    if (!auth.ok) return auth.response;
    const session = auth.session;
    const userId = session?.user.id;

    const parsed = await parseBody(req, createAssignmentSchema);
    if (!parsed.ok) return parsed.response;

    // The moduleId in the body must belong to the course in the URL —
    // otherwise an assignment could land in an unrelated course's module.
    const courseModule = await prisma.courseModule.findUnique({
      where: { id: parsed.data.moduleId },
      select: { courseId: true },
    });
    if (!courseModule || courseModule.courseId !== params.id) {
      return NextResponse.json({ error: 'Module not found in this course' }, { status: 400 });
    }

    const membership = await getCourseMembership(params.id, userId);
    if (!membership.courseExists) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }
    if (!canManageCourse(membership)) {
      return NextResponse.json({ error: 'Only the course teacher can create assignments' }, { status: 403 });
    }

    const assignment = await prisma.assignment.create({ data: { title: parsed.data.title, description: parsed.data.description, moduleId: parsed.data.moduleId, dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null, maxScore: parsed.data.maxScore ?? 100, allowLate: parsed.data.allowLate ?? false, createdBy: session.user.id } });
    return NextResponse.json(assignment, { status: 201 });
  } catch (error) {
    console.error("POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
