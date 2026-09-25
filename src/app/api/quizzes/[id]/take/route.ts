import { NextRequest, NextResponse } from 'next/server';
import { getAppwriteSession } from "@/lib/appwrite-server-auth";
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getAppwriteSession(req);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = session?.user.id;

    const quiz = await prisma.quiz.findUnique({
      where: { id: params.id },
      include: {
        questions: { orderBy: { order: 'asc' } },
        attempts: { where: { studentId: userId }, orderBy: { startedAt: 'desc' } },
      },
    });
    if (!quiz) return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    const attemptsUsed = quiz.attempts.length;
    return NextResponse.json({ quiz, canAttempt: attemptsUsed < quiz.maxAttempts, attemptsUsed });
  } catch (error) {
    console.error("GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getAppwriteSession(req);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = session?.user.id;

    const body = await req.json();
    const { answers } = body;
    const quiz = await prisma.quiz.findUnique({ where: { id: params.id }, include: { questions: true } });
    if (!quiz) return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });

    let score = 0;
    const gradedAnswers = quiz.questions.map((q, i) => {
      const userAnswer = answers?.[i] || '';
      const correct = userAnswer === q.answer;
      if (correct) score += q.points;
      return { questionId: q.id, userAnswer, correct, points: correct ? q.points : 0 };
    });
    const attempt = await prisma.quizAttempt.create({
      data: { quizId: params.id, studentId: userId, answers: JSON.stringify(gradedAnswers), score, completed: true, endedAt: new Date() },
    });
    return NextResponse.json({ attempt, score, total: quiz.questions.reduce((a, q) => a + q.points, 0) });
  } catch (error) {
    console.error("POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
