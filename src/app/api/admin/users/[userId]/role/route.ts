import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAppwriteSession } from '@/lib/appwrite-server-auth';
import { parseBody, adminRoleSchema } from '@/lib/validation';

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
    const parsed = await parseBody(request, adminRoleSchema);
    if (!parsed.ok) return parsed.response;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role: parsed.data.role },
      select: { id: true, name: true, role: true },
    });

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    console.error('Admin role update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
