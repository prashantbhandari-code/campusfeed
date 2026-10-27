export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { withRateLimit } from "@/lib/security/rateLimit";
import { generateOtp, sendOtpEmail } from "@/lib/email";

// Same "sent" answer whether or not the account exists, so this can't probe for users.
const sent = () =>
  NextResponse.json({
    success: true,
    message: "If an account exists, a recovery code has been sent.",
  });

async function handler(req: Request) {
  try {
    const { email } = await req.json();
    if (!email || !email.endsWith("@kiit.ac.in")) {
      return NextResponse.json({ error: "Valid KIIT email required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return sent();

    // Generate a 6-digit OTP — short expiry, single use
    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Replace any existing unused code for this user
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, used: false } });
    await prisma.passwordResetToken.create({
      data: { userId: user.id, token: otp, expiresAt },
    });

    // Brevo first, Resend whenever Brevo is unconfigured or its send failed
    await sendOtpEmail(email, user.name, otp);

    return sent();
  } catch (error) {
    console.error("Forgot password error:", error);
    return sent();
  }
}

export const POST = withRateLimit(handler, { windowMs: 60000, maxRequests: 5 });
