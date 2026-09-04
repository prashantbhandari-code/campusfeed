import { NextRequest, NextResponse } from 'next/server';
import { getAppwriteSession } from "@/lib/appwrite-server-auth";
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getAppwriteSession(req);
    if (!(session?.user as any)?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session?.user as any).id;

    const body = await req.json();
    const { name, description } = body;

    const course = await prisma.course.findUnique({ where: { id: params.id } });
    if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 });

    const maxOrder = await prisma.courseModule.findFirst({
      where: { courseId: params.id },
      orderBy: { order: 'desc' },
      select: { order: true },
    });

    const module = await prisma.courseModule.create({
      data: {
        name,
        description,
        courseId: params.id,
        order: (maxOrder?.order ?? 0) + 1,
      },
    });

    return NextResponse.json(module, { status: 201 });
  } catch (error) {
    console.error("POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
