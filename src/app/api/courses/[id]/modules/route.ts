import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
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
}
