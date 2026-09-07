export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { withRateLimit } from "@/lib/rateLimit";
import crypto from "crypto";
import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://campusconnect-osm1.onrender.com";

function generateResetToken(): string {
  return crypto.randomBytes(32).toString("hex");
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
      return NextResponse.json({ success: true, message: "If an account exists, a recovery email has been sent." });
    }

    // Generate a secure reset token
    const token = generateResetToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Delete any existing unused tokens for this user
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id, used: false },
    });

    // Store the new token
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    // Build the reset URL
    const resetUrl = `${APP_URL}/auth/reset-password?token=${token}`;

    // Send email via Resend
    if (RESEND_API_KEY && RESEND_API_KEY !== "re_your_key_here") {
      const resend = new Resend(RESEND_API_KEY);
      await resend.emails.send({
        from: "CampusConnect <onboarding@resend.dev>",
        to: email,
        subject: "Reset your CampusConnect password",
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2563eb; font-size: 28px; margin: 0;">🎓 CampusConnect</h1>
            </div>
            <div style="background: #f8fafc; border-radius: 12px; padding: 30px; margin-bottom: 20px;">
              <h2 style="color: #1e293b; font-size: 20px; margin-top: 0;">Reset Your Password</h2>
              <p style="color: #475569; line-height: 1.6;">
                Hi ${user.name || "there"},<br><br>
                We received a request to reset your password for your CampusConnect account.
                Click the button below to create a new password:
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" style="background: #2563eb; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
                  Reset Password
                </a>
              </div>
              <p style="color: #64748b; font-size: 14px;">
                This link expires in 1 hour. If you didn't request this, you can safely ignore this email.
              </p>
            </div>
            <p style="color: #94a3b8; font-size: 12px; text-align: center;">
              CampusConnect — Your Campus Hub
            </p>
          </div>
        `,
      });
      console.log(`Reset email sent to ${email}`);
    } else {
      // Resend not configured — log the link for development
      console.log(`[DEV] Password reset link for ${email}: ${resetUrl}`);
    }

    return NextResponse.json({ success: true, message: "If an account exists, a recovery email has been sent." });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ success: true, message: "If an account exists, a recovery email has been sent." });
  }
}

export const POST = withRateLimit(handler, { windowMs: 60000, maxRequests: 5 });
