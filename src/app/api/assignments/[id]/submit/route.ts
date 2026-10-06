import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "@/lib/server-auth";
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(req);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = session?.user.id;
    const body = await req.json();
    const assignment = await prisma.assignment.findUnique({ where: { id: params.id } });
    if (!assignment) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const existing = await prisma.submission.findUnique({ where: { assignmentId_studentId: { assignmentId: params.id, studentId: userId } } });
    if (existing) {
      const updated = await prisma.submission.update({ where: { id: existing.id }, data: { content: body.content, fileUrl: body.fileUrl, fileName: body.fileName, status: 'resubmitted' } });
      return NextResponse.json(updated);
    }
    const submission = await prisma.submission.create({ data: { assignmentId: params.id, studentId: userId, content: body.content, fileUrl: body.fileUrl, fileName: body.fileName } });
    return NextResponse.json(submission, { status: 201 });
  } catch (error) {
    console.error("POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(req);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const submission = await prisma.submission.findUnique({ where: { assignmentId_studentId: { assignmentId: params.id, studentId: session?.user.id } }, include: { assignment: true } });
    return NextResponse.json(submission || null);
  } catch (error) {
    console.error("GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}