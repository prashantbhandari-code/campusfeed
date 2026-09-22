export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { withRateLimit } from "@/lib/rateLimit";
import crypto from "crypto";
import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY || "";

function generateOtp(): string {
  // 6-digit numeric code: 100000..999999
  return crypto.randomInt(100000, 1000000).toString();
}

async function handler(req: Request) {
  try {
    const { email } = await req.json();
    if (!email || !email.endsWith("@kiit.ac.in")) {
      return NextResponse.json({ error: "Valid KIIT email required" }, { status: 400 });
    }

    // Find user in PostgreSQL
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Don't reveal whether user exists — show success anyway
      return NextResponse.json({ success: true, message: "If an account exists, a recovery code has been sent." });
    }

    // Generate a 6-digit OTP — short expiry, single use
    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Delete any existing unused codes for this user
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id, used: false },
    });

    // Store the new code (token column holds the OTP)
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token: otp,
        expiresAt,
      },
    });

    // Send the OTP via Resend
    if (RESEND_API_KEY && RESEND_API_KEY !== "re_your_key_here") {
      const resend = new Resend(RESEND_API_KEY);
      const sent = await resend.emails.send({
        from: "CampusConnect <onboarding@resend.dev>",
        to: email,
        subject: "Your CampusConnect password reset code",
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2563eb; font-size: 28px; margin: 0;">🎓 CampusConnect</h1>
            </div>
            <div style="background: #f8fafc; border-radius: 12px; padding: 30px; margin-bottom: 20px;">
              <h2 style="color: #1e293b; font-size: 20px; margin-top: 0;">Reset Your Password</h2>
              <p style="color: #475569; line-height: 1.6;">
                Hi ${user.name || "there"},<br><br>
                Enter this code on the reset page to choose a new password:
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <span style="display: inline-block; background: #1e293b; color: white; font-size: 36px; font-weight: 700; letter-spacing: 12px; padding: 16px 28px; border-radius: 12px;">
                  ${otp}
                </span>
              </div>
              <p style="color: #64748b; font-size: 14px;">
                This code expires in 10 minutes and can be used once. If you didn't request this, you can safely ignore this email.
              </p>
            </div>
            <p style="color: #94a3b8; font-size: 12px; text-align: center;">
              CampusConnect — Your Campus Hub
            </p>
          </div>
        `,
      });
      if (sent.error) {
        console.error(`Resend delivery FAILED for ${email}: ${sent.error.name} — ${sent.error.message}`);
      } else {
        console.log(`Reset OTP sent to ${email}`);
      }
    } else {
      // Resend not configured — log the code for development
      console.log(`[DEV] Password reset OTP for ${email}: ${otp}`);
    }

    return NextResponse.json({ success: true, message: "If an account exists, a recovery code has been sent." });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ success: true, message: "If an account exists, a recovery code has been sent." });
  }
}

export const POST = withRateLimit(handler, { windowMs: 60000, maxRequests: 5 });
