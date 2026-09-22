export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { createSessionCookie } from "@/lib/session-cookie";
import { withRateLimit } from "@/lib/rateLimit";

/**
 * Direct login endpoint: verifies email/password against PostgreSQL,
 * sets signed cc_session cookie. No Appwrite SDK involved.
 */
async function handler(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    // 1. Find user in PostgreSQL
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // 2. Check if user has a password (Google OAuth users have placeholder password)
    if (!user.password || user.password.startsWith("google-managed-")) {
      return NextResponse.json(
        { error: "no-password", message: "This account uses Google sign-in. Please use 'Sign in with Google'." },
        { status: 403 }
      );
    }

    // 3. Verify bcrypt password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // 4. Set signed cc_session cookie
    const response = NextResponse.json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email, username: user.username },
    });

    response.headers.append("Set-Cookie", createSessionCookie(user.id));

    return response;
  } catch (error) {
    console.error("POST /api/auth/login error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export const POST = withRateLimit(handler, { maxRequests: 10, windowMs: 60000 });
