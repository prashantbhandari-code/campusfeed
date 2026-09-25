import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAppwriteSession } from '@/lib/appwrite-server-auth';

export async function GET(request: Request) {
  try {
    const session = await getAppwriteSession(request);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

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
