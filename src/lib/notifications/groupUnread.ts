import prisma from "@/lib/db/prisma";
import { isMissingTable } from "@/lib/db/prisma-errors";

// Unread group messages for one viewer, summed across every group they're in.
//
// Unread is per-group, not per-user: each membership carries its own
// lastReadAt marker, so "unread" means "someone else sent this after I last
// opened that group". Same rule as the per-group count in /api/groups/[id],
// just totalled for the nav badge.
export async function countUnreadGroupMessages(userId: string): Promise<number> {
  const memberships = await prisma.groupMember.findMany({
    where: { userId },
    select: { groupId: true, lastReadAt: true },
  });

  if (memberships.length === 0) return 0;

  try {
    return await prisma.groupMessage.count({
      where: {
        senderId: { not: userId },
        deletedForEveryone: false,
        OR: memberships.map((membership) => ({
          groupId: membership.groupId,
          // Never opened that group → everything anyone else ever said counts.
          createdAt: { gt: membership.lastReadAt ?? new Date(0) },
        })),
      },
    });
  } catch (e) {
    if (isMissingTable(e)) return 0;
    throw e;
  }
}
