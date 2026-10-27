export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import bcrypt from "bcryptjs";
import { createSessionCookie } from "@/lib/auth/session-cookie";
import { withRateLimit } from "@/lib/security/rateLimit";
import { parseBody, loginSchema } from "@/lib/security/validation";

/**
 * A real cost-12 bcrypt hash of a value no account can have. It exists only
 * to burn the same CPU as a genuine comparison when the account is unknown,
 * so login timing does not reveal whether an email/username exists.
 */
const DUMMY_PASSWORD_HASH =
  "$2a$12$6ep1zG20RLw.isSJ.s0Vie6zmGvhzoqolVRF3j.uRa6hrRO2OJpFK";

/**
 * Direct login endpoint: verifies email/password against PostgreSQL,
 * sets signed cc_session cookie. No Appwrite SDK involved.
 */
async function handler(req: Request) {
  try {
    const parsed = await parseBody(req, loginSchema);
    if (!parsed.ok) return parsed.response;
    const { email: identifier, password } = parsed.data;

    // 1. Find user by email OR username (diagram: "Username / KIIT mail")
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: identifier, mode: "insensitive" } },
          { username: { equals: identifier, mode: "insensitive" } },
        ],
      },
    });
    if (!user) {
      // Equalise the work against the password-mismatch path below; returning
      // straight away would make unknown accounts measurably faster.
      await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
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
