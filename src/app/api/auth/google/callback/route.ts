export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createSessionCookie } from "@/lib/session-cookie";
import { generateUsername } from "@/lib/user";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";

export async function GET(req: Request) {
  const url = new URL(req.url);
  try {
    const code = url.searchParams.get("code");
    const error = url.searchParams.get("error");

    // Get the origin from the request
    const origin = url.origin;

    if (error || !code) {
      const loginUrl = new URL("/login", origin);
      loginUrl.searchParams.set("error", "google-failed");
      return NextResponse.redirect(loginUrl);
    }

    // 1. Exchange auth code for tokens
    const redirectUri = `${origin}/api/auth/google/callback`;
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
      const loginUrl = new URL("/login", origin);
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
      const loginUrl = new URL("/login", origin);
      loginUrl.searchParams.set("error", "google-failed");
      return NextResponse.redirect(loginUrl);
    }

    const googleProfile = await profileRes.json();
    const { email, name, picture, id: googleId } = googleProfile;

    if (!email) {
      const loginUrl = new URL("/login", origin);
      loginUrl.searchParams.set("error", "google-failed");
      return NextResponse.redirect(loginUrl);
    }

    // University mail required — `hd` above is only a hint, this is the check
    // (mirrors the email/password register path).
    if (!email.endsWith("@kiit.ac.in")) {
      const loginUrl = new URL("/login", origin);
      loginUrl.searchParams.set("error", "not-kiit");
      return NextResponse.redirect(loginUrl);
    }

    // 3. Check if user exists in PostgreSQL
    let user = await prisma.user.findUnique({ where: { email } });
    let isNewUser = false;

    if (!user) {
      isNewUser = true;
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

    // 4. Set signed cc_session cookie. New users must fill required details
    // first (diagram: "student have to filled required details").
    const destUrl = new URL(isNewUser ? "/auth/complete-profile" : "/feed", origin);
    const response = NextResponse.redirect(destUrl);

    response.headers.append("Set-Cookie", createSessionCookie(user.id));

    return response;
  } catch (error) {
    console.error("Google OAuth callback error:", error);
    const loginUrl = new URL("/login", url.origin);
    loginUrl.searchParams.set("error", "google-failed");
    return NextResponse.redirect(loginUrl);
  }
}
