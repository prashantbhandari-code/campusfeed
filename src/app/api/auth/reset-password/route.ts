export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { withRateLimit } from "@/lib/rateLimit";

const APPWRITE_ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1";
const APPWRITE_PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "";

/**
 * Password reset — the ONLY way to change a password without being logged in.
 *
 * Proof of identity: the Appwrite recovery userId+secret pair from the emailed
 * reset link. The server verifies it directly against Appwrite (PUT
 * /account/recovery), which both validates the secret AND sets the new
 * password in Appwrite. Only after Appwrite confirms does the server update
 * the PostgreSQL hash. The client's email claim is never trusted on its own.
 */
async function handler(req: Request) {
  try {
    const { userId, secret, email, password } = await req.json();

    if (!userId || !secret || !password) {
      // Deliberately identical message whether fields are missing or invalid
      return NextResponse.json({ error: "Invalid or expired reset link" }, { status: 401 });
    }

    if (typeof password !== "string" || password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    // 1. Verify the recovery secret AND set the new Appwrite password in one
    //    server-side call. Appwrite rejects an unknown/expired secret with 401.
    const recoverRes = await fetch(APPWRITE_ENDPOINT + "/account/recovery", {
      method: "PUT",
      headers: {
        "X-Appwrite-Project": APPWRITE_PROJECT_ID,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId, secret, password }),
    });

    if (!recoverRes.ok) {
      const awErr = await recoverRes.text().catch(() => "");
      console.warn("Password reset rejected — Appwrite recovery failed:", recoverRes.status, awErr.slice(0, 300));
      return NextResponse.json({ error: "Invalid or expired reset link" }, { status: 401 });
    }

    // Recovery completed — the new password is now set in Appwrite. The
    // recovery response has no email, so resolve the account via the admin API.
    const recovered = await recoverRes.json();
    const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY || "";
    let awEmail: string | undefined;
    if (APPWRITE_API_KEY) {
      const userRes = await fetch(`${APPWRITE_ENDPOINT}/users/${recovered.userId}`, {
        headers: { "X-Appwrite-Project": APPWRITE_PROJECT_ID, "X-Appwrite-Key": APPWRITE_API_KEY },
      });
      if (userRes.ok) {
        awEmail = (await userRes.json())?.email;
      }
    }

    if (!awEmail || (email && email.toLowerCase() !== awEmail.toLowerCase())) {
      return NextResponse.json({ error: "Invalid or expired reset link" }, { status: 401 });
    }

    // 2. Appwrite verified the secret — now update the matching PostgreSQL user
    const user = await prisma.user.findUnique({ where: { email: awEmail } });
    if (!user) {
      // Appwrite account exists but no PG profile — nothing to update here
      return NextResponse.json({ error: "Invalid or expired reset link" }, { status: 401 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword, appwriteId: recovered.userId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export const POST = withRateLimit(handler, { windowMs: 60000, maxRequests: 10 });
