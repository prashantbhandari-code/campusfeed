export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { withRateLimit } from "@/lib/rateLimit";

const APPWRITE_ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1";
const APPWRITE_PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "";

async function handler(req: Request) {
  try {
    const { email } = await req.json();
    if (!email || !email.endsWith("@kiit.ac.in")) {
      return NextResponse.json({ error: "Valid KIIT email required" }, { status: 400 });
    }

    // Find user in PostgreSQL
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Don't reveal whether user exists
      return NextResponse.json({ success: true, message: "If an account exists, a recovery email has been sent." });
    }

    // If user has no Appwrite account, create one first
    if (!user.appwriteId) {
      const tempPassword = "reset_" + Date.now() + "_" + Math.random().toString(36).slice(2);
      const createRes = await fetch(APPWRITE_ENDPOINT + "/account", {
        method: "POST",
        headers: {
          "X-Appwrite-Project": APPWRITE_PROJECT_ID,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: "unique()",
          email,
          password: tempPassword,
          name: user.name,
        }),
      });

      if (createRes.ok) {
        const data = await createRes.json();
        await prisma.user.update({
          where: { id: user.id },
          data: { appwriteId: data.$id },
        });

        // Send recovery email via Appwrite
        const redirectUrl = req.headers.get("origin") + "/auth/reset-password";
        const recoveryRes = await fetch(APPWRITE_ENDPOINT + "/account/recovery", {
          method: "POST",
          headers: {
            "X-Appwrite-Project": APPWRITE_PROJECT_ID,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, url: redirectUrl }),
        });

        if (!recoveryRes.ok) {
          console.error("Recovery email failed:", await recoveryRes.text());
        }
      } else {
        console.error("Appwrite account creation failed:", await createRes.text());
      }
    } else {
      // User already has Appwrite account - send recovery directly
      const redirectUrl = req.headers.get("origin") + "/auth/reset-password";
      await fetch(APPWRITE_ENDPOINT + "/account/recovery", {
        method: "POST",
        headers: {
          "X-Appwrite-Project": APPWRITE_PROJECT_ID,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, url: redirectUrl }),
      });
    }

    return NextResponse.json({ success: true, message: "If an account exists, a recovery email has been sent." });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ success: true, message: "If an account exists, a recovery email has been sent." });
  }
}

// Triggers outbound emails — strict limit against mail-bombing/enumeration
export const POST = withRateLimit(handler, { windowMs: 60000, maxRequests: 5 });
