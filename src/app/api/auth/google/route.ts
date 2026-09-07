export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const PROD_ORIGIN = "https://campusconnect-osm1.onrender.com";

function getGoogleAuthUrl(origin: string) {
  // Use production origin for redirect URI (Google Cloud Console must have it registered)
  const base = PROD_ORIGIN;
  const redirectUri = `${base}/api/auth/google/callback`;
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
