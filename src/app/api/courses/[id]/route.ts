import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!(session?.user as any)?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const course = await prisma.course.findUnique({ where: { id: params.id }, include: { creator: { select: { id: true, name: true, avatar: true } }, modules: { include: { assignments: true, quizzes: true }, orderBy: { order: 'asc' } }, materials: true, _count: { select: { modules: true, materials: true } } } });
    if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    return NextResponse.json(course);
  } catch (error) {
    console.error("GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!(session?.user as any)?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const course = await prisma.course.findUnique({ where: { id: params.id } });
    if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    if (course.createdBy !== (session?.user as any).id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    await prisma.course.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}