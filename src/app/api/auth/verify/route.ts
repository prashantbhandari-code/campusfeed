export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/auth/verify?token=xxx — verify email
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Token required" }, { status: 400 });
    }

    // Find the token
    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token },
    });

    if (!verificationToken) {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }

    if (verificationToken.type !== "email_verify") {
      return NextResponse.json({ error: "Invalid token type" }, { status: 400 });
    }

    if (new Date() > verificationToken.expiresAt) {
      await prisma.verificationToken.delete({ where: { token } });
      return NextResponse.json({ error: "Token expired" }, { status: 400 });
    }

    // Mark user as verified
    const user = await prisma.user.findUnique({
      where: { email: verificationToken.email },
    });

    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: { verified: true },
      });
    }

    // Delete used token
    await prisma.verificationToken.delete({ where: { token } });

    // Redirect to login with success
    return NextResponse.redirect(
      new URL("/login?verified=true", req.url)
    );
  } catch (error) {
    console.error("Verification error:", error);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
