import { describe, it, expect } from "vitest";

// Rate limiting has to fail *closed*.
//
// Before this file existed, a missing Upstash configuration replaced every
// limiter with an always-success stub: login, signup, OTP verification and
// every write endpoint were unthrottled, with no error and no log. These tests
// run with no UPSTASH_REDIS_REST_* env set — exactly that degraded
// configuration — and assert that limits still bite.
//
// If someone reintroduces an always-allow fallback, these fail.

import { authRatelimit, checkUserRateLimit } from "@/lib/security/rate-limit";

const uniqueKey = () => `test-${Math.random().toString(36).slice(2)}`;

describe("rate limiting with no Upstash configured", () => {
  it("still enforces the auth limit (10/min)", async () => {
    const key = uniqueKey();
    const results = [];
    for (let i = 0; i < 11; i++) {
      results.push(await authRatelimit.limit(key));
    }

    expect(results.slice(0, 10).every((r) => r.success)).toBe(true);
    expect(results[10].success).toBe(false);
    expect(results[10].remaining).toBe(0);
  });

  it("still enforces the per-user story limit (10/hour)", async () => {
    const userId = uniqueKey();
    const results = [];
    for (let i = 0; i < 11; i++) {
      results.push(await checkUserRateLimit(userId, "story"));
    }

    expect(results.slice(0, 10).every((r) => r.success)).toBe(true);
    expect(results[10].success).toBe(false);
  });

  it("keeps limits scoped to the caller's key", async () => {
    const exhausted = uniqueKey();
    const untouched = uniqueKey();

    for (let i = 0; i < 10; i++) {
      await authRatelimit.limit(exhausted);
    }

    expect((await authRatelimit.limit(exhausted)).success).toBe(false);
    expect((await authRatelimit.limit(untouched)).success).toBe(true);
  });
});
