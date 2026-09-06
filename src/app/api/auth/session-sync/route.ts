export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createSessionToken } from "@/lib/session-token";
import { withRateLimit } from "@/lib/rateLimit";

const APPWRITE_ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1";
const APPWRITE_PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "";

/**
 * Session sync — the single place where an Appwrite session becomes an
 * app-server session.
 *
 * Appwrite (cloud.appwrite.io) stores its session cookie on its own domain,
 * but the app's server APIs authenticate via app-domain cookies. After ANY
 * login (email/password, registration, Google OAuth) the client calls this
 * endpoint with a short-lived JWT minted from its fresh Appwrite session:
 *
 * 1. Client calls POST /account/jwt (Appwrite SDK) right after login.
 * 2. Server verifies the JWT directly against the Appwrite API
 *    (X-Appwrite-JWT header) — the client cannot forge an identity.
 * 3. On success, links the Appwrite ID to the PostgreSQL user (if needed) and * sets the signed HttpOnly cc_session cookie that all app APIs require.
 */
async function handler(req: Request) {  try {
    const { jwt } = await req.json();
    if (!jwt || typeof jwt !== "string") {
      return NextResponse.json({ error: "jwt required" }, { status: 400 });
    }

    // Verify the JWT against Appwrite — identity comes from the server, not the client
    const verifyRes = await fetch(`${APPWRITE_ENDPOINT}/account`, {
      headers: {
        "X-Appwrite-Project": APPWRITE_PROJECT_ID,
        "X-Appwrite-JWT": jwt,
      },
    });

    if (!verifyRes.ok) {
      return NextResponse.json({ error: "Invalid Appwrite session" }, { status: 401 });
    }

    const awUser = await verifyRes.json();

    // Find the PostgreSQL user by Appwrite ID, falling back to email
    let user = await prisma.user.findFirst({
      where: { appwriteId: awUser.$id },
      select: { id: true, name: true, email: true, username: true, appwriteId: true },
    });

    if (!user) {
      user = await prisma.user.findFirst({
        where: { email: awUser.email },
        select: { id: true, name: true, email: true, username: true, appwriteId: true },
      });

      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: { appwriteId: awUser.$id },
        });
      }
    }

    if (!user) {
      return NextResponse.json(
        { error: "profile-not-found", redirect: "/auth/complete-profile?email=" + encodeURIComponent(awUser.email || "") },
        { status: 404 }
      );
    }

    const response = NextResponse.json({
      success: true,
      user: { id: user.id, name: user.name, username: user.username },
    });

    response.headers.append(
      "Set-Cookie",
      `cc_session=${createSessionToken(user.id)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000`
    );

    return response;
  } catch (error) {
    console.error("Session sync error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Mints the app session credential — moderate limit, high enough for all
// login paths (email, register, OAuth callback) firing on one page load
export const POST = withRateLimit(handler, { windowMs: 60000, maxRequests: 30 });
