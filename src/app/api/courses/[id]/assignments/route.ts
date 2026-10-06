import { NextRequest, NextResponse } from 'next/server';
import { getAppwriteSession } from "@/lib/appwrite-server-auth";
import prisma from '@/lib/prisma';
import { getCourseMembership, canManageCourse } from '@/lib/lms-auth';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getAppwriteSession(req);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = session?.user.id;

    const body = await req.json();
    if (!body.title || !body.moduleId) return NextResponse.json({ error: 'Title and module required' }, { status: 400 });

    // The moduleId in the body must belong to the course in the URL —
    // otherwise an assignment could land in an unrelated course's module.
    const courseModule = await prisma.courseModule.findUnique({
      where: { id: body.moduleId },
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

    const assignment = await prisma.assignment.create({ data: { title: body.title, description: body.description, moduleId: body.moduleId, dueDate: body.dueDate ? new Date(body.dueDate) : null, maxScore: body.maxScore ? parseInt(body.maxScore) : 100, allowLate: body.allowLate ?? false, createdBy: session?.user.id } });
    return NextResponse.json(assignment, { status: 201 });
  } catch (error) {
    console.error("POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
