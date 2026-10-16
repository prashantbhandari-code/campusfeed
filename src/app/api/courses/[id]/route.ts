import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from "@/lib/api-auth";
import prisma from '@/lib/prisma';
import { getCourseMembership, canManageCourse, canParticipateInCourse } from '@/lib/lms-auth';

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const auth = await requireUser(req);
    if (!auth.ok) return auth.response;
    const session = auth.session;
    const membership = await getCourseMembership(params.id, session.user.id);
    if (!membership.courseExists) return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    const course = await prisma.course.findUnique({ where: { id: params.id }, include: { creator: { select: { id: true, name: true, avatar: true } }, modules: { include: { assignments: true, quizzes: true }, orderBy: { order: 'asc' } }, materials: true, _count: { select: { modules: true, materials: true } } } });
    if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    // Materials/assignments/quizzes are for enrolled students and staff. The
    // detail page is also the join surface, so non-participants still get the
    // course shell (metadata + empty lists) to render the Join button.
    if (!canParticipateInCourse(membership)) {
      return NextResponse.json({ ...course, modules: [], materials: [] });
    }
    return NextResponse.json(course);
  } catch (error) {
    console.error("GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const auth = await requireUser(req);
    if (!auth.ok) return auth.response;
    const session = auth.session;
    const membership = await getCourseMembership(params.id, session.user.id);
    if (!membership.courseExists) return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    if (!canManageCourse(membership)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    await prisma.course.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
