import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from "@/lib/api-auth";
import prisma from '@/lib/prisma';
import { getCourseMembership, canManageCourse } from '@/lib/lms-auth';
import { parseBody, createModuleSchema } from '@/lib/validation';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireUser(req);
    if (!auth.ok) return auth.response;
    const session = auth.session;
    const userId = session?.user.id;

    const parsed = await parseBody(req, createModuleSchema);
    if (!parsed.ok) return parsed.response;
    const { name, description } = parsed.data;

    const course = await prisma.course.findUnique({ where: { id: params.id } });
    if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 });

    const membership = await getCourseMembership(params.id, userId);
    if (!canManageCourse(membership)) {
      return NextResponse.json({ error: 'Only the course teacher can add modules' }, { status: 403 });
    }

    const maxOrder = await prisma.courseModule.findFirst({
      where: { courseId: params.id },
      orderBy: { order: 'desc' },
      select: { order: true },
    });

    const created = await prisma.courseModule.create({
      data: {
        name,
        description,
        courseId: params.id,
        order: (maxOrder?.order ?? 0) + 1,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
