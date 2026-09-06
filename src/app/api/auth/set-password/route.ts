export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { withRateLimit } from "@/lib/rateLimit";

const APPWRITE_ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1";
const APPWRITE_PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "";

/**
 * Set password — for users who signed up with Google and want email/password
 * login too. Proof of identity: a short-lived Appwrite JWT minted from the
 * user's current session (same verification chain as /api/auth/session-sync).
 * The email claim is never trusted; the password is set for the JWT identity
 * only. Passwordless users without a session must use the recovery-email flow.
 */
async function handler(req: Request) {
  try {
    const { jwt, password } = await req.json();

    if (!jwt || typeof jwt !== "string") {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    if (typeof password !== "string" || password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    // 1. Verify the JWT against Appwrite — identity comes from the server
    const verifyRes = await fetch(APPWRITE_ENDPOINT + "/account", {
      headers: {
        "X-Appwrite-Project": APPWRITE_PROJECT_ID,
        "X-Appwrite-JWT": jwt,
      },
    });

    if (!verifyRes.ok) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const awUser = await verifyRes.json();

    // 2. Update the Appwrite password (if Appwrite rejects it, e.g. legacy
    //    accounts with short existing passwords, continue — PG is authoritative)
    const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY || "";
    if (APPWRITE_API_KEY) {
      await fetch(`${APPWRITE_ENDPOINT}/users/${awUser.$id}/password`, {
        method: "PATCH",
        headers: {
          "X-Appwrite-Project": APPWRITE_PROJECT_ID,
          "X-Appwrite-Key": APPWRITE_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      }).catch(() => {});
    }

    // 3. Update the PostgreSQL user linked to this Appwrite identity
    const user = await prisma.user.findFirst({
      where: { OR: [{ appwriteId: awUser.$id }, { email: awUser.email }] },
    });

    if (!user) {
      return NextResponse.json({ error: "No account found. Please sign up first." }, { status: 404 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword, appwriteId: awUser.$id },
    });

    return NextResponse.json({ success: true, message: "Password set successfully." });
  } catch (error) {
    console.error("Set password error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export const POST = withRateLimit(handler, { windowMs: 60000, maxRequests: 10 });
