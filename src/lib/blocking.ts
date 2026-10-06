import prisma from "@/lib/prisma";

// getBlockedIds sits under nearly every content read (posts, comments,
// stories, messages, groups) AND once per second per SSE stream. A 3s
// staleness window is imperceptible for blocking — blocks are rare and
// retroactive — and turns the repeated scan into at most one query per user
// per window.
const BLOCKED_TTL_MS = 3000;
const blockedCache = new Map<string, { ids: string[]; expires: number }>();

/**
 * Every user ID the viewer is blocked by, or has blocked themselves.
 * Deduped union — enforcement treats both directions identically.
 * Served from a 3s TTL cache; call invalidateBlockedIdsCache() after
 * block/unblock writes to make the change visible immediately.
 */
export async function getBlockedIds(userId: string): Promise<string[]> {
  const now = Date.now();
  const hit = blockedCache.get(userId);
  if (hit && hit.expires > now) return hit.ids;

  const rows = await prisma.blockedUser.findMany({
    where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
    select: { blockerId: true, blockedId: true },
  });
  const unique = new Set<string>();
  rows.forEach((r) => unique.add(r.blockerId === userId ? r.blockedId : r.blockerId));
  const ids = Array.from(unique);

  blockedCache.set(userId, { ids, expires: now + BLOCKED_TTL_MS });
  if (blockedCache.size > 10_000) {
    blockedCache.forEach((v, k) => {
      if (v.expires <= now) blockedCache.delete(k);
    });
  }
  return ids;
}

/** Drop cached blocked-IDs for the affected users (both sides of a block). */
export function invalidateBlockedIdsCache(...userIds: Array<string | null | undefined>) {
  for (const id of userIds) {
    if (id) blockedCache.delete(id);
  }
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
