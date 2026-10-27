import { NextRequest, NextResponse } from "next/server";
import { authRatelimit, writeRatelimit, socketRatelimit } from "@/lib/security/rate-limit";

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}

async function checkLimit(
  limiter: { limit: (_key: string) => Promise<{ success: boolean; remaining: number; reset: number }> },
  key: string
) {
  return limiter.limit(key);
}

export async function proxy(request: NextRequest) {
  const method = request.method;
  const pathname = request.nextUrl.pathname;
  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  if (method === "GET" && pathname === "/api/realtime") {
    const key = `${getClientIp(request)}:${pathname}`;
    const result = await checkLimit(writeRatelimit, key);
    if (!result.success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later.", retryAfter: Math.ceil((result.reset - Date.now()) / 1000) },
        { status: 429, headers: { "Retry-After": String(Math.ceil((result.reset - Date.now()) / 1000)) } }
      );
    }
    const response = NextResponse.next();
    response.headers.set("X-RateLimit-Remaining", String(result.remaining));
    return response;
  }

  if (method !== "POST" && method !== "PUT" && method !== "PATCH" && method !== "DELETE") {
    return NextResponse.next();
  }

  const ip = getClientIp(request);
  const key = `${ip}:${pathname}`;

  let result: { success: boolean; remaining: number; reset: number };
  if (/^\/api\/auth\/(login|register|forgot-password|reset-password)$/.test(pathname)) {
    result = await checkLimit(authRatelimit, key);
  } else if (pathname === "/api/socketio") {
    result = await checkLimit(socketRatelimit, key);
  } else {
    result = await checkLimit(writeRatelimit, key);
  }

  if (!result.success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later.", retryAfter: Math.ceil((result.reset - Date.now()) / 1000) },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((result.reset - Date.now()) / 1000)),
        },
      }
    );
  }

  const response = NextResponse.next();
  response.headers.set("X-RateLimit-Remaining", String(result.remaining));
  return response;
}

export const config = {
  matcher: ["/api/:path*"],
};