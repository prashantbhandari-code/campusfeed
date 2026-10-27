import prisma from "@/lib/db/prisma";
import { redis } from "@/lib/security/rate-limit";

const BLOCKED_PREFIX = "blocked:";
const BLOCKED_TTL_SECONDS = 60;

/**
 * Every user ID the viewer is blocked by, or has blocked themselves.
 * Deduped union — enforcement treats both directions identically.
 * Served from Redis cache with 60s TTL; call invalidateBlockedCache() after
 * block/unblock writes to make the change visible immediately.
 */
export async function getBlockedIds(userId: string): Promise<string[]> {
  const key = `${BLOCKED_PREFIX}${userId}`;

  if (redis) {
    const cached = await redis.get<string[]>(key);
    if (cached) return cached;
  }

  const rows = await prisma.blockedUser.findMany({
    where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
    select: { blockerId: true, blockedId: true },
  });
  const unique = new Set<string>();
  rows.forEach((r) => unique.add(r.blockerId === userId ? r.blockedId : r.blockerId));
  const ids = Array.from(unique);

  if (redis) {
    await redis.set(key, ids, { ex: BLOCKED_TTL_SECONDS });
  }

  return ids;
}

/** Drop cached blocked-IDs for the affected users (both sides of a block). */
export async function invalidateBlockedCache(...userIds: Array<string | null | undefined>) {
  if (!redis) return;
  for (const id of userIds) {
    if (id) await redis.del(`${BLOCKED_PREFIX}${id}`);
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
