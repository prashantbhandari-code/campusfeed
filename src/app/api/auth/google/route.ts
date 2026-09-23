export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";

function getGoogleAuthUrl(origin: string) {
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
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = url.origin;
  const authUrl = getGoogleAuthUrl(origin);
  return NextResponse.redirect(authUrl);
}
