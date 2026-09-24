import prisma from "@/lib/prisma";

/**
 * Every user ID the viewer is blocked by, or has blocked themselves.
 * Deduped union — enforcement treats both directions identically.
 */
export async function getBlockedIds(userId: string): Promise<string[]> {
  const rows = await prisma.blockedUser.findMany({
    where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
    select: { blockerId: true, blockedId: true },
  });
  const ids = new Set<string>();
  rows.forEach((r) => ids.add(r.blockerId === userId ? r.blockedId : r.blockerId));
  return Array.from(ids);
}

/** True if either user has blocked the other. */
export async function isBlockedPair(a: string, b: string): Promise<boolean> {
  const n = await prisma.blockedUser.count({
    where: {
      OR: [
        { blockerId: a, blockedId: b },
        { blockerId: b, blockedId: a },
      ],
    },
  });
  return n > 0;
}
