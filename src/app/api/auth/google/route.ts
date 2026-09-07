export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || "";

function getGoogleAuthUrl(origin: string) {
  const redirectUri = GOOGLE_REDIRECT_URI || `${origin}/api/auth/google/callback`;
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "consent",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = url.origin;
  const authUrl = getGoogleAuthUrl(origin);
  return NextResponse.redirect(authUrl);
}
