export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { createSessionToken } from "@/lib/session-token";

const APPWRITE_ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1";
const APPWRITE_PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "";

/**
 * Migration endpoint: For users who existed before the Appwrite migration.
 * Verifies password against PostgreSQL (bcrypt), then creates Appwrite account + session.
 */
export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    // 1. Find user in PostgreSQL
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // 2. Check if user has a password (Google OAuth users have null password)
    if (!user.password) {
      return NextResponse.json({ error: "no-password", message: "This account was created with Google. Please use Google sign-in, or set a password first." }, { status: 403 });
    }

    // 3. Verify bcrypt password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // 3. Create or update Appwrite account
    let appwriteUserId = user.appwriteId;
    if (!appwriteUserId) {
      const createRes = await fetch(APPWRITE_ENDPOINT + "/account", {
        method: "POST",
        headers: {
          "X-Appwrite-Project": APPWRITE_PROJECT_ID,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: "unique()", email, password, name: user.name }),
      });
      if (createRes.ok) {
        const data = await createRes.json();
        appwriteUserId = data.$id || null;
      }
    }

    // 4. Link Appwrite ID to PostgreSQL user
    if (appwriteUserId && !user.appwriteId) {
      await prisma.user.update({
        where: { id: user.id },
        data: { appwriteId: appwriteUserId },
      });
    }

    // 5. Update Appwrite password to match PostgreSQL (in case it was set to a temp password)
    if (appwriteUserId) {
      const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY || "";
      await fetch(APPWRITE_ENDPOINT + "/users/" + appwriteUserId + "/password", {
        method: "PATCH",
        headers: {
          "X-Appwrite-Project": APPWRITE_PROJECT_ID,
          "X-Appwrite-Key": APPWRITE_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password: password }),
      }).catch(() => {});
    }

    // 6. Create Appwrite session
    const sessionRes = await fetch(APPWRITE_ENDPOINT + "/account/sessions", {
      method: "POST",
      headers: {
        "X-Appwrite-Project": APPWRITE_PROJECT_ID,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    if (!sessionRes.ok) {
      return NextResponse.json({ error: "Session creation failed" }, { status: 500 });
    }

    // 6. Forward Appwrite session cookie + set a SIGNED cc_session cookie
    // (HttpOnly + server-signed so it cannot be forged client-side)
    const setCookie = sessionRes.headers.get("set-cookie");
    const response = NextResponse.json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email },
    });

    if (setCookie) {
      const cookieParts = setCookie.split(";")[0];
      response.headers.append("Set-Cookie", cookieParts + "; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000");
    }
    response.headers.append(
      "Set-Cookie",
      `cc_session=${createSessionToken(user.id)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000`
    );

    return response;
  } catch (error) {
    console.error("Migration error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}