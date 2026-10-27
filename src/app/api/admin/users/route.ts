import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { requireAdmin } from '@/lib/auth/api-auth';

export async function GET(request: Request) {
  try {
    const auth = await requireAdmin(request);
    if (!auth.ok) return auth.response;

    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        role: true,
        verified: true,
        department: true,
        createdAt: true,
        _count: { select: { posts: true, followers: true, following: true } },
      },
      take: 200,
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Admin users error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
