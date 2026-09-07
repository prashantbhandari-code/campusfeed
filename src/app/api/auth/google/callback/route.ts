export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createSessionToken } from "@/lib/session-token";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const PROD_ORIGIN = "https://campusconnect-osm1.onrender.com";

function generateUsername(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^[^a-z0-9]+/, "")
    .replace(/[^a-z0-9]+$/, "")
    .trim();
  const short = base.slice(0, 16) || "user";
  const suffix = Math.floor(1000 + Math.random() * 8999);
  return `${short}_${suffix}`;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const error = url.searchParams.get("error");

    if (error || !code) {
      const loginUrl = new URL("/login", url.origin);
      loginUrl.searchParams.set("error", "google-failed");
      return NextResponse.redirect(loginUrl);
    }

    // 1. Exchange auth code for tokens
    const redirectUri = `${PROD_ORIGIN}/api/auth/google/callback`;
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      console.error("Google token exchange failed:", tokenRes.status);
      const loginUrl = new URL("/login", url.origin);
      loginUrl.searchParams.set("error", "google-failed");
      return NextResponse.redirect(loginUrl);
    }

    const tokens = await tokenRes.json();

    // 2. Fetch user profile from Google
    const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!profileRes.ok) {
      console.error("Google profile fetch failed:", profileRes.status);
      const loginUrl = new URL("/login", url.origin);
      loginUrl.searchParams.set("error", "google-failed");
      return NextResponse.redirect(loginUrl);
    }

    const googleProfile = await profileRes.json();
    const { email, name, picture, id: googleId } = googleProfile;

    if (!email) {
      const loginUrl = new URL("/login", url.origin);
      loginUrl.searchParams.set("error", "google-failed");
      return NextResponse.redirect(loginUrl);
    }

    // 3. Check if user exists in PostgreSQL
    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      // New user — create profile
      const username = generateUsername(name || email.split("@")[0]);
      user = await prisma.user.create({
        data: {
          appwriteId: `google_${googleId}`,
          name: name || "",
          username,
          email,
          password: "google-managed-" + Math.random().toString(36).slice(2),
          avatar: picture || null,
          collegeEmail: email,
          verified: true,
        },
      });
    }

    // 4. Set signed cc_session cookie
    const sessionToken = createSessionToken(user.id);

    const feedUrl = new URL("/feed", url.origin);
    const response = NextResponse.redirect(feedUrl);

    response.headers.append(
      "Set-Cookie",
      `cc_session=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000`
    );

    return response;
  } catch (error) {
    console.error("Google OAuth callback error:", error);
    const loginUrl = new URL("/login", new URL(req.url).origin);
    loginUrl.searchParams.set("error", "google-failed");
    return NextResponse.redirect(loginUrl);
  }
}
