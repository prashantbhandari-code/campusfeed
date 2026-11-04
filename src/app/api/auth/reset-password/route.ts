export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import bcrypt from "bcryptjs";
import { withRateLimit } from "@/lib/security/rateLimit";

// Per-account brute-force guard.
//
// The code is only six digits, and the per-IP limiter above is bypassable by
// rotating proxies — so the per-account counter is what actually protects the
// keyspace. Counted in memory deliberately: adding an `attempts` column would
// require a Prisma migration, and the *effect* of reaching the cap is durable
// anyway, because we mark the stored code used. The attacker then has to
// request a fresh code, which /api/auth/forgot-password rate-limits per IP.
const MAX_OTP_ATTEMPTS = 5;
const OTP_ATTEMPT_WINDOW_MS = 15 * 60_000;
const MAX_TRACKED_ACCOUNTS = 10_000;
const otpFailures = new Map<string, { count: number; expires: number }>();

function noteOtpFailure(userId: string): number {
  const now = Date.now();
  if (otpFailures.size > MAX_TRACKED_ACCOUNTS) otpFailures.clear();
  const entry = otpFailures.get(userId);
  if (!entry || now >= entry.expires) {
    otpFailures.set(userId, { count: 1, expires: now + OTP_ATTEMPT_WINDOW_MS });
    return 1;
  }
  entry.count += 1;
  return entry.count;
}

function clearOtpFailures(userId: string) {
  otpFailures.delete(userId);
}

/**
 * Password reset — verifies the 6-digit OTP emailed by /api/auth/forgot-password,
 * then updates the password in PostgreSQL. Single-use, time-limited code.
 * No Appwrite dependency.
 */
async function handler(req: Request) {
  try {
    const { email, otp, password } = await req.json();

    if (!email || !otp || !password) {
      return NextResponse.json({ error: "Email, code and password required" }, { status: 400 });
    }

    if (typeof password !== "string" || password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    // Generic failure — same response whether the email, code, or expiry is wrong,
    // so this endpoint can't be used to probe which accounts exist.
    const fail = () => NextResponse.json({ error: "Invalid or expired code" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return fail();

    // 1. The most recent unused code for this user. Looking up by user and then
    //    comparing the submitted code (rather than querying by token) is what
    //    lets a wrong guess be counted — a lookup by token just finds nothing
    //    and tells us nothing about whether someone is guessing.
    const resetToken = await prisma.passwordResetToken.findFirst({
      where: { userId: user.id, used: false },
      orderBy: { createdAt: "desc" },
    });

    if (!resetToken) return fail();

    // 2. Expired?
    if (new Date() > resetToken.expiresAt) return fail();

    // 3. Wrong code? Count the attempt, and once the cap is hit burn the code so
    //    a six-digit brute force has to start over from a fresh request.
    if (resetToken.token !== String(otp)) {
      const failures = noteOtpFailure(user.id);
      if (failures >= MAX_OTP_ATTEMPTS) {
        await prisma.passwordResetToken
          .update({ where: { id: resetToken.id }, data: { used: true } })
          .catch(() => {});
        clearOtpFailures(user.id);
      }
      return fail();
    }

    // 4. Hash the new password and update
    const hashedPassword = await bcrypt.hash(password, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    // 5. Mark the code as used (single-use) and clear the failure counter
    await prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { used: true },
    });
    clearOtpFailures(user.id);

    console.log(`Password reset successful for ${user.email}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export const POST = withRateLimit(handler, { windowMs: 60000, maxRequests: 10 });
