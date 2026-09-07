export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { withRateLimit } from "@/lib/rateLimit";

/**
 * Password reset — verifies the token from the emailed link,
 * updates the password in PostgreSQL. No Appwrite dependency.
 */
async function handler(req: Request) {
  try {
    const { token, password } = await req.json();

    if (!token || !password) {
      return NextResponse.json({ error: "Invalid or expired reset link" }, { status: 401 });
    }

    if (typeof password !== "string" || password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    // 1. Find the token
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!resetToken) {
      return NextResponse.json({ error: "Invalid or expired reset link" }, { status: 401 });
    }

    // 2. Check if token is expired
    if (new Date() > resetToken.expiresAt) {
      return NextResponse.json({ error: "Reset link has expired. Please request a new one." }, { status: 401 });
    }

    // 3. Check if token was already used
    if (resetToken.used) {
      return NextResponse.json({ error: "Reset link has already been used. Please request a new one." }, { status: 401 });
    }

    // 4. Find the user
    const user = await prisma.user.findUnique({ where: { id: resetToken.userId } });
    if (!user) {
      return NextResponse.json({ error: "Invalid or expired reset link" }, { status: 401 });
    }

    // 5. Hash the new password and update
    const hashedPassword = await bcrypt.hash(password, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    // 6. Mark the token as used
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
