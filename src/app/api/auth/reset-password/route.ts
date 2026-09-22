export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { withRateLimit } from "@/lib/rateLimit";

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

    // 1. Find the OTP for this user (token column holds the code)
    const resetToken = await prisma.passwordResetToken.findFirst({
      where: { userId: user.id, token: String(otp) },
    });

    if (!resetToken) return fail();

    // 2. Expired?
    if (new Date() > resetToken.expiresAt) return fail();

    // 3. Already used?
    if (resetToken.used) return fail();

    // 4. Hash the new password and update
    const hashedPassword = await bcrypt.hash(password, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    // 5. Mark the code as used (single-use)
    await prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { used: true },
    });

    console.log(`Password reset successful for ${user.email}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export const POST = withRateLimit(handler, { windowMs: 60000, maxRequests: 10 });
