import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { parseBody, adminRoleSchema } from '@/lib/security/validation';
import { requireAdmin } from '@/lib/auth/api-auth';

export async function PATCH(request: NextRequest, props: { params: Promise<{ userId: string }> }) {
  const params = await props.params;
  try {
    const auth = await requireAdmin(request);
    if (!auth.ok) return auth.response;

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
