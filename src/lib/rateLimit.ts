import { NextResponse } from "next/server";

// Simple in-memory rate limiter
// In production, use Redis-backed (e.g., @upstash/ratelimit)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

interface RateLimitOptions {
  windowMs: number;  // Time window in milliseconds
  maxRequests: number; // Max requests per window
}

export function rateLimit(
  identifier: string,
  options: RateLimitOptions = { windowMs: 60000, maxRequests: 60 }
): { success: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record || now > record.resetTime) {
    // New window
    rateLimitMap.set(identifier, {
      count: 1,
      resetTime: now + options.windowMs,
    });
    return {
      success: true,
      remaining: options.maxRequests - 1,
      resetTime: now + options.windowMs,
    };
  }

  if (record.count >= options.maxRequests) {
    // Rate limit exceeded
    return {
      success: false,
      remaining: 0,
      resetTime: record.resetTime,
    };
  }

  // Increment count
  record.count++;
  return {
    success: true,
    remaining: options.maxRequests - record.count,
    resetTime: record.resetTime,
  };
}

// Helper to get client IP from request
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return "unknown";
}

// Higher-order function to wrap API handlers with rate limiting.
// ctx (Next.js route params) passes through untouched so handlers on
// dynamic segments keep receiving { params }.
export function withRateLimit<T = any>(
  handler: (req: Request, ctx: T) => Promise<NextResponse>,
  options?: RateLimitOptions
) {
  return async (req: Request, ctx?: T): Promise<NextResponse> => {
    const ip = getClientIp(req);
    const endpoint = new URL(req.url).pathname;
    const key = `${ip}:${endpoint}`;

    const { success, remaining, resetTime } = rateLimit(key, options);

    if (!success) {
      return NextResponse.json(
        {
          error: "Too many requests. Please try again later.",
          retryAfter: Math.ceil((resetTime - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": String(options?.maxRequests || 60),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(Math.ceil(resetTime / 1000)),
            "Retry-After": String(Math.ceil((resetTime - Date.now()) / 1000)),
          },
        }
      );
    }

    const response = await handler(req, ctx as T);
    response.headers.set("X-RateLimit-Limit", String(options?.maxRequests || 60));
    response.headers.set("X-RateLimit-Remaining", String(remaining));
    response.headers.set("X-RateLimit-Reset", String(Math.ceil(resetTime / 1000)));

    return response;
  };
}
