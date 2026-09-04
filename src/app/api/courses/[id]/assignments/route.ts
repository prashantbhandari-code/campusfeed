import { NextRequest, NextResponse } from 'next/server';
import { getAppwriteSession } from "@/lib/appwrite-server-auth";
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getAppwriteSession(req);
    if (!(session?.user as any)?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    if (!body.title || !body.moduleId) return NextResponse.json({ error: 'Title and module required' }, { status: 400 });
    const assignment = await prisma.assignment.create({ data: { title: body.title, description: body.description, moduleId: body.moduleId, dueDate: body.dueDate ? new Date(body.dueDate) : null, maxScore: body.maxScore ? parseInt(body.maxScore) : 100, allowLate: body.allowLate ?? false, createdBy: (session?.user as any).id } });
    return NextResponse.json(assignment, { status: 201 });
  } catch (error) {
    console.error("POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}