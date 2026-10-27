export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth/session-cookie";

/**
 * Clears the signed cc_session cookie on sign-out. The Appwrite SDK session
 * is deleted client-side; this handles the server-side half so the user is
 * fully logged out.
 */
export async function POST() {
  const response = NextResponse.json({ success: true });
  response.headers.append("Set-Cookie", clearSessionCookie());
  return response;
}
