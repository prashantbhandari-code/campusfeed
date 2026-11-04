import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

export let redis: Redis | null = null;
if (redisUrl && redisToken) {
  redis = new Redis({ url: redisUrl, token: redisToken });
}

// ---------------------------------------------------------------------------
// Degraded-mode limiting.
//
// This used to be an always-allow stub: when Upstash was not configured every
// limit silently vanished, so login, signup, OTP verification and every write
// endpoint were unthrottled and nothing reported it. Rate limiting is a safety
// property, not an optimisation, so a missing Redis now degrades to a working
// in-process limiter and says so loudly instead of pretending to work.
//
// Caveat, stated plainly: the fallback counter is per-process. With N
// instances a caller gets roughly N x the configured limit, and counters reset
// on restart or deploy. That is strictly better than unlimited, but setting
// UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN restores exact, shared
// limiting and is still the deployment default you want.
// ---------------------------------------------------------------------------
const MAX_TRACKED_KEYS = 10_000;

function parseWindowMs(window: string): number {
  const match = window.match(/^\s*(\d+)\s*(ms|s|m|h)?\s*$/i);
  if (!match) return 60_000;
  const value = Number(match[1]);
  switch ((match[2] || "s").toLowerCase()) {
    case "ms":
      return value;
    case "m":
      return value * 60_000;
    case "h":
      return value * 3_600_000;
    default:
      return value * 1_000;
  }
}

interface LimiterResult {
  success: boolean;
  remaining: number;
  reset: number;
}

function createMemoryLimiter(max: number, window: string) {
  const windowMs = parseWindowMs(window);
  const buckets = new Map<string, { count: number; reset: number }>();
  return {
    limit: async (key: string): Promise<LimiterResult> => {
      const now = Date.now();
      // Bounded memory: keys are IP:path, so a hostile client could otherwise
      // grow this map without limit.
      if (buckets.size > MAX_TRACKED_KEYS) buckets.clear();
      let bucket = buckets.get(key);
      if (!bucket || now >= bucket.reset) {
        bucket = { count: 0, reset: now + windowMs };
        buckets.set(key, bucket);
      }
      bucket.count += 1;
      return {
        success: bucket.count <= max,
        remaining: Math.max(0, max - bucket.count),
        reset: bucket.reset,
      };
    },
  };
}

let warnedAboutDegradedMode = false;

function warnDegradedMode() {
  if (warnedAboutDegradedMode) return;
  warnedAboutDegradedMode = true;
  console.warn(
    "[rate-limit] UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are not set. " +
      "Using an in-process limiter: limits are per-instance and reset on restart. " +
      "Set both variables for shared, exact rate limiting."
  );
}

function makeLimiter(max: number, window: string) {
  if (!redis) {
    warnDegradedMode();
    return createMemoryLimiter(max, window);
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

type UserAction = "post" | "comment" | "like" | "dm" | "group-message" | "story";

const USER_LIMITS: Record<UserAction, { max: number; window: string }> = {
  post: { max: 10, window: "60 s" },
  comment: { max: 30, window: "60 s" },
  like: { max: 120, window: "60 s" },
  dm: { max: 60, window: "60 s" },
  "group-message": { max: 60, window: "60 s" },
  story: { max: 10, window: "3600 s" },
};

// One limiter per action, built once (the Redis path used to allocate a new
// Ratelimit instance on every single call).
const userLimiters = new Map<UserAction, { limit: (_key: string) => Promise<LimiterResult> }>();

function getUserLimiter(action: UserAction) {
  const existing = userLimiters.get(action);
  if (existing) return existing;
  const { max, window } = USER_LIMITS[action];
  const limiter = redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(max, window as any),
        prefix: "rl:user:",
      })
    : (warnDegradedMode(), createMemoryLimiter(max, window));
  userLimiters.set(action, limiter as { limit: (_key: string) => Promise<LimiterResult> });
  return limiter as { limit: (_key: string) => Promise<LimiterResult> };
}

export async function checkUserRateLimit(
  userId: string,
  action: UserAction
): Promise<LimiterResult> {
  return getUserLimiter(action).limit(`user:${userId}:${action}`);
}
