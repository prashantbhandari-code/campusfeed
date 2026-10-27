import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

export let redis: Redis | null = null;
if (redisUrl && redisToken) {
  redis = new Redis({ url: redisUrl, token: redisToken });
}

// Simple mock limiter that always succeeds
function createMockLimiter(max: number) {
  return {
    limit: async (_key: string) => ({ success: true, remaining: max, reset: Date.now() + 60000 }),
  };
}

function makeLimiter(max: number, window: string) {
  if (!redis) {
    return createMockLimiter(max);
  }
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(max, window as any),
    analytics: true,
    prefix: "rl:",
  });
}

export const ratelimit = makeLimiter(60, "60 s");
export const authRatelimit = makeLimiter(10, "60 s");
export const writeRatelimit = makeLimiter(60, "60 s");
export const socketRatelimit = makeLimiter(240, "60 s");
export const blockRatelimit = makeLimiter(100, "60 s");
export const typingRatelimit = makeLimiter(30, "10 s");

export async function checkUserRateLimit(
  userId: string,
  action: "post" | "comment" | "like" | "dm" | "group-message" | "story"
): Promise<{ success: boolean; remaining: number; reset: number }> {
  const limits: Record<string, { max: number; window: string }> = {
    post: { max: 10, window: "60 s" },
    comment: { max: 30, window: "60 s" },
    like: { max: 120, window: "60 s" },
    dm: { max: 60, window: "60 s" },
    "group-message": { max: 60, window: "60 s" },
    story: { max: 10, window: "3600 s" },
  };
  const { max, window } = limits[action];
  if (!redis) return { success: true, remaining: max, reset: Date.now() + 60000 };
  const limiter = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(max, window as any), prefix: "rl:user:" });
  return limiter.limit(`user:${userId}:${action}`);
}