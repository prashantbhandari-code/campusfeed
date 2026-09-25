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

    const [totalUsers, totalPosts, totalGroups, totalMessages, usersByRole, recentUsers] =
      await Promise.all([
        prisma.user.count(),
        prisma.post.count(),
        prisma.group.count(),
        prisma.message.count(),
        prisma.user.groupBy({ by: ['role'], _count: true }),
        prisma.user.findMany({
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
            role: true,
            verified: true,
            createdAt: true,
            _count: { select: { posts: true, followers: true } },
          },
        }),
      ]);

    return NextResponse.json({
      totalUsers,
      totalPosts,
      totalGroups,
      totalMessages,
      usersByRole: usersByRole.map(r => ({ role: r.role, count: r._count })),
      recentUsers,
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
