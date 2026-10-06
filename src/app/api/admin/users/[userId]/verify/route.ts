import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { parseBody, adminVerifySchema } from '@/lib/validation';
import { requireAdmin } from '@/lib/api-auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const auth = await requireAdmin(request);
    if (!auth.ok) return auth.response;

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
