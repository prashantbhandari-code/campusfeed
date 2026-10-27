export const dynamic = "force-dynamic";

import crypto from "crypto";
import { NextResponse } from "next/server";
import { oauthStateCookie } from "@/lib/auth/session-cookie";
import { publicOrigin } from "@/lib/auth/public-origin";

function getGoogleAuthUrl(origin: string, state: string) {
  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";

  if (!GOOGLE_CLIENT_ID) {
    console.error("Missing GOOGLE_CLIENT_ID in environment variables");
  }

  // Use request origin for redirect URI
  const base = origin;
  const redirectUri = `${base}/api/auth/google/callback`;
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    // No `prompt: consent` — that forces the consent screen on every login.
    // Omitting it lets returning users sign in with a single click; Google
    // still asks for consent the first time.
    // Pre-filter the account chooser to university accounts.
    // Google treats `hd` as a hint only — the callback re-verifies the domain.
    hd: "kiit.ac.in",
    // CSRF binding: echoed back unchanged on the callback, where it is
    // compared against an HttpOnly cookie set below. Without this, a victim
    // can be handed an attacker's `code` and silently logged into the
    // attacker's account.
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  // Behind Render's proxy url.origin is the internal bind address
  // (https://localhost:10000) - Google needs the public origin.
  const origin = publicOrigin(req, url);

  // 32 random bytes: unguessable, and never reused between flows.
  const state = crypto.randomBytes(32).toString("hex");
  const authUrl = getGoogleAuthUrl(origin, state);

  const response = NextResponse.redirect(authUrl);
  response.headers.append("Set-Cookie", oauthStateCookie(state));
  return response;
}
