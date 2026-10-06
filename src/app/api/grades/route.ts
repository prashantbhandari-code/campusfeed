import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "@/lib/server-auth";
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(req);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = session?.user.id;

    const grades = await prisma.grade.findMany({ where: { studentId: userId }, orderBy: { createdAt: 'desc' } });
    const quizAttempts = await prisma.quizAttempt.findMany({
      where: { studentId: userId, completed: true },
      include: { quiz: { include: { module: { include: { course: true } } } } },
      orderBy: { endedAt: 'desc' },
    });
    const submissions = await prisma.submission.findMany({
      where: { studentId: userId, score: { not: null } },
      include: { assignment: { include: { module: { include: { course: true } } } } },
      orderBy: { submittedAt: 'desc' },
    });
    return NextResponse.json({ grades, quizAttempts, submissions });
  } catch (error) {
    console.error("GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
