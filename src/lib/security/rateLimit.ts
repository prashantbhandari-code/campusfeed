import { NextResponse } from "next/server";
import { ratelimit, authRatelimit, writeRatelimit, socketRatelimit, checkUserRateLimit } from "./rate-limit";

// Higher-order function to wrap API handlers with rate limiting.
// ctx (Next.js route params) passes through untouched so handlers on
// dynamic segments keep receiving { params }.
export function withRateLimit<T = any>(
  handler: (req: Request, ctx: T) => Promise<NextResponse>,
  options?: { windowMs?: number; maxRequests?: number; keyPrefix?: string }
) {
  // Determine which limiter to use based on endpoint
  return async (req: Request, ctx?: T): Promise<NextResponse> => {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const endpoint = new URL(req.url).pathname;

    // Select limiter based on endpoint pattern
    let limiter = ratelimit;
    if (/^\/api\/auth\/(login|register|forgot-password|reset-password)$/.test(endpoint)) {
      limiter = authRatelimit;
    } else if (endpoint === "/api/socketio") {
      limiter = socketRatelimit;
    } else if (endpoint.startsWith("/api/")) {
      limiter = writeRatelimit;
    }

    const key = options?.keyPrefix ? `${options.keyPrefix}:${ip}:${endpoint}` : `${ip}:${endpoint}`;
    const { success, remaining, reset } = await limiter.limit(key);

    if (!success) {
      return NextResponse.json(
        {
          error: "Too many requests. Please try again later.",
          retryAfter: Math.ceil((reset - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": String(options?.maxRequests || 60),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(Math.ceil(reset / 1000)),
            "Retry-After": String(Math.ceil((reset - Date.now()) / 1000)),
          },
        }
      );
    }

    const response = await handler(req, ctx as T);
    response.headers.set("X-RateLimit-Limit", String(options?.maxRequests || 60));
    response.headers.set("X-RateLimit-Remaining", String(remaining));
    response.headers.set("X-RateLimit-Reset", String(Math.ceil(reset / 1000)));

    return response;
  };
}

// Export for backward compatibility
export { checkUserRateLimit };
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return "unknown";
}