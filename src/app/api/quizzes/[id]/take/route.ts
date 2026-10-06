import { NextRequest, NextResponse } from 'next/server';
import { getAppwriteSession } from "@/lib/appwrite-server-auth";
import prisma from '@/lib/prisma';
import { getCourseMembership, canParticipateInCourse } from '@/lib/lms-auth';
import { parseBody, quizTakeSchema } from '@/lib/validation';

// Question fields sent to students — `answer` must never appear here.
const quizQuestionSelect = {
  id: true,
  question: true,
  type: true,
  options: true,
  points: true,
  order: true,
} as const;

async function loadQuizForStudent(quizId: string) {
  return prisma.quiz.findUnique({
    where: { id: quizId },
    select: {
      id: true,
      title: true,
      description: true,
      timeLimit: true,
      maxAttempts: true,
      module: { select: { courseId: true } },
      questions: { orderBy: { order: 'asc' }, select: quizQuestionSelect },
    },
  });
}

async function authorizeQuizAccess(courseId: string, userId: string) {
  const membership = await getCourseMembership(courseId, userId);
  if (!canParticipateInCourse(membership)) {
    return NextResponse.json({ error: 'You are not enrolled in this course' }, { status: 403 });
  }
  return null;
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getAppwriteSession(req);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = session.user.id;

    const quiz = await loadQuizForStudent(params.id);
    if (!quiz) return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });

    const denied = await authorizeQuizAccess(quiz.module.courseId, userId);
    if (denied) return denied;

    const attemptsUsed = await prisma.quizAttempt.count({
      where: { quizId: quiz.id, studentId: userId },
    });
    return NextResponse.json({
      quiz,
      canAttempt: attemptsUsed < quiz.maxAttempts,
      attemptsUsed,
    });
  } catch (error) {
    console.error("GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getAppwriteSession(req);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = session.user.id;

    const parsed = await parseBody(req, quizTakeSchema);
    if (!parsed.ok) return parsed.response;

    // Full questions incl. `answer` — grading is server-side only; the answer
    // key reaches the student exclusively through `review` after submitting.
    const quiz = await prisma.quiz.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        maxAttempts: true,
        module: { select: { courseId: true } },
        questions: { orderBy: { order: 'asc' } },
      },
    });
    if (!quiz) return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });

    const denied = await authorizeQuizAccess(quiz.module.courseId, userId);
    if (denied) return denied;

    // GET computes canAttempt for the UI; POST is what actually enforces it.
    const attemptsUsed = await prisma.quizAttempt.count({
      where: { quizId: quiz.id, studentId: userId },
    });
    if (attemptsUsed >= quiz.maxAttempts) {
      return NextResponse.json({ error: 'No attempts remaining' }, { status: 403 });
    }

    let score = 0;
    const gradedAnswers = quiz.questions.map((q, i) => {
      const userAnswer = parsed.data.answers[i] ?? '';
      const correct = userAnswer === q.answer;
      if (correct) score += q.points;
      return { questionId: q.id, userAnswer, correct, points: correct ? q.points : 0 };
    });
    const attempt = await prisma.quizAttempt.create({
      data: { quizId: params.id, studentId: userId, answers: JSON.stringify(gradedAnswers), score, completed: true, endedAt: new Date() },
    });
    const review = quiz.questions.map((q, i) => ({
      questionId: q.id,
      question: q.question,
      userAnswer: gradedAnswers[i].userAnswer,
      correct: gradedAnswers[i].correct,
      points: gradedAnswers[i].points,
      correctAnswer: q.answer,
    }));
    return NextResponse.json({
      attempt,
      score,
      total: quiz.questions.reduce((a, q) => a + q.points, 0),
      review,
    });
  } catch (error) {
    console.error("POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
