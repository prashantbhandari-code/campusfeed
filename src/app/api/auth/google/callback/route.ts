export const dynamic = "force-dynamic";

import crypto from "crypto";
import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import {
  createSessionCookie,
  clearOauthStateCookie,
  readCookie,
  OAUTH_STATE_COOKIE,
} from "@/lib/auth/session-cookie";
import { publicOrigin } from "@/lib/auth/public-origin";
import { generateUsername } from "@/lib/auth/user";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";

/** Constant-time comparison, so the state check cannot be timing-probed. */
function stateMatches(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  // The token exchange must send Google the same public redirect_uri the
  // browser arrived with - behind Render's proxy url.origin is the internal
  // bind address (https://localhost:10000), which Google would reject.
  const origin = publicOrigin(req, url);

  /** Every exit spends the state cookie, whether it succeeded or not. */
  const done = (res: NextResponse) => {
    res.headers.append("Set-Cookie", clearOauthStateCookie());
    return res;
  };

  try {
    // --- CSRF check, run BEFORE any code is exchanged -------------------
    // Google echoes `state` back unchanged, and the HttpOnly cookie proves
    // this browser started the flow. A missing or mismatched pair means the
    // callback was forged, so no session is minted.
    const returnedState = url.searchParams.get("state") || "";
    const expectedState = readCookie(req.headers.get("cookie"), OAUTH_STATE_COOKIE) || "";
    if (!returnedState || !expectedState || !stateMatches(returnedState, expectedState)) {
      console.error("Google OAuth state mismatch — rejecting callback (possible login CSRF)");
      const stateFailUrl = new URL("/login", origin);
      stateFailUrl.searchParams.set("error", "google-state");
      return done(NextResponse.redirect(stateFailUrl));
    }

    const code = url.searchParams.get("code");
    const error = url.searchParams.get("error");

    if (error || !code) {
      const loginUrl = new URL("/login", origin);
      loginUrl.searchParams.set("error", "google-failed");
      return done(NextResponse.redirect(loginUrl));
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
      return done(NextResponse.redirect(loginUrl));
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
      return done(NextResponse.redirect(loginUrl));
    }

    const googleProfile = await profileRes.json();
    const { email, name, picture, id: googleId } = googleProfile;

    if (!email) {
      const loginUrl = new URL("/login", origin);
      loginUrl.searchParams.set("error", "google-failed");
      return done(NextResponse.redirect(loginUrl));
    }

    // University mail required — `hd` above is only a hint, this is the check
    // (mirrors the email/password register path).
    if (!email.endsWith("@kiit.ac.in")) {
      const loginUrl = new URL("/login", origin);
      loginUrl.searchParams.set("error", "not-kiit");
      return done(NextResponse.redirect(loginUrl));
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
          // Placeholder only — login rejects any `google-managed-` password.
          // Uses a CSPRNG rather than Math.random for defence in depth.
          password: "google-managed-" + crypto.randomBytes(32).toString("hex"),
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

    return done(response);
  } catch (error) {
    console.error("Google OAuth callback error:", error);
    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set("error", "google-failed");
    return done(NextResponse.redirect(loginUrl));
  }
}
