import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { requireAdmin } from '@/lib/auth/api-auth';

export async function GET(request: Request) {
  try {
    const auth = await requireAdmin(request);
    if (!auth.ok) return auth.response;

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
