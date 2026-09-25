import { NextRequest, NextResponse } from "next/server";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

// Central rate limiting for unsafe API writes (H4 from the code review).
//
// Per-route withRateLimit() stays on the routes that already have it (those
// limits keep counting independently); this middleware closes the coverage
// gap for the 34 write routes that had no limit at all, and it covers any
// route added later without remembering to wrap it.
//
// NOTE: the store in rateLimit.ts is in-memory (per serverless instance).
// Same accepted limitation as before — swap for Upstash Redis if abuse
// ever becomes real.
const WINDOW_MS = 60_000;

function limitFor(pathname: string): number {
  // Credential guessing is the expensive one to get wrong — stay tight.
  if (/^\/api\/auth\/(login|register|forgot-password|reset-password)$/.test(pathname)) {
    return 10;
  }
  // socketio POST carries typing ticks + call signals (offer/answer/ICE
  // bursts) — a normal call emits dozens of rows in seconds, so this needs
  // generous headroom or we'd 429 mid-handshake.
  if (pathname === "/api/socketio") {
    return 240;
  }
  // Everything else that mutates state: 60 writes/min/IP is far above any
  // human interaction rate and below anything useful for scraping/spam.
  return 60;
}

export async function middleware(request: NextRequest) {
  const method = request.method;
  if (method !== "POST" && method !== "PUT" && method !== "PATCH" && method !== "DELETE") {
    return NextResponse.next();
  }

  const pathname = request.nextUrl.pathname;
  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const key = `${getClientIp(request)}:${pathname}`;
  const { success, remaining, resetTime } = rateLimit(key, {
    windowMs: WINDOW_MS,
    maxRequests: limitFor(pathname),
  });

  if (!success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later.", retryAfter: Math.ceil((resetTime - Date.now()) / 1000) },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((resetTime - Date.now()) / 1000)),
        },
      }
    );
  }

  const response = NextResponse.next();
  response.headers.set("X-RateLimit-Remaining", String(remaining));
  return response;
}

export const config = {
  // Only API routes — pages, static assets, and the SSE stream (GET) pass
  // through untouched (GET is never limited above anyway).
  matcher: ["/api/:path*"],
};
