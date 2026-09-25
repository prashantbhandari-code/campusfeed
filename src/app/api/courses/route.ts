import { NextRequest, NextResponse } from 'next/server';
import { getAppwriteSession } from "@/lib/appwrite-server-auth";
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getAppwriteSession(req);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
    const session = await getAppwriteSession(req);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    if (!body.name || !body.code) return NextResponse.json({ error: 'Name and code required' }, { status: 400 });
    const course = await prisma.course.create({ data: { name: body.name, code: body.code.toUpperCase(), description: body.description, department: body.department, semester: body.semester ? parseInt(body.semester) : null, credits: body.credits ? parseInt(body.credits) : 3, createdBy: session?.user.id } });
    return NextResponse.json(course, { status: 201 });
  } catch (error) {
    console.error("POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}