import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAppwriteSession } from '@/lib/appwrite-server-auth';
import { parseBody, adminVerifySchema } from '@/lib/validation';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getAppwriteSession(request);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { userId } = params;
    const parsed = await parseBody(request, adminVerifySchema);
    if (!parsed.ok) return parsed.response;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { verified: parsed.data.verified },
      select: { id: true, name: true, verified: true },
    });

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    console.error('Admin verify error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
