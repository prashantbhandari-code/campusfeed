import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from "@/lib/auth/api-auth";
import { parseBody, createCourseSchema } from '@/lib/security/validation';
import prisma from '@/lib/db/prisma';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireUser(req);
    if (!auth.ok) return auth.response;
    const session = auth.session;
    const { searchParams } = new URL(req.url);
    const where: any = {};
    if (searchParams.get('department')) where.department = searchParams.get('department');
    if (searchParams.get('semester')) where.semester = parseInt(searchParams.get('semester')!);
    const courses = await prisma.course.findMany({ where, include: { creator: { select: { id: true, name: true, avatar: true } }, _count: { select: { modules: true, materials: true } } }, orderBy: { createdAt: 'desc' } });
    return NextResponse.json(courses);
  } catch (error) {
    console.error("GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireUser(req);
    if (!auth.ok) return auth.response;
    const session = auth.session;
    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
    if (user?.role !== 'teacher' && user?.role !== 'admin') {
      return NextResponse.json({ error: 'Only teachers can create courses' }, { status: 403 });
    }
    const parsed = await parseBody(req, createCourseSchema);
    if (!parsed.ok) return parsed.response;
    const course = await prisma.course.create({ data: { name: parsed.data.name, code: parsed.data.code.toUpperCase(), description: parsed.data.description, department: parsed.data.department, semester: parsed.data.semester ?? null, credits: parsed.data.credits ?? 3, createdBy: session.user.id } });
    return NextResponse.json(course, { status: 201 });
  } catch (error) {
    console.error("POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}