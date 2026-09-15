export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

/**
 * Clears the signed cc_session cookie on sign-out. The Appwrite SDK session
 * is deleted client-side; this handles the server-side half so the user is
 * fully logged out.
 */
export async function POST() {
  const isProduction = process.env.NODE_ENV === "production";
  const response = NextResponse.json({ success: true });
  response.headers.append(
    "Set-Cookie",
    `cc_session=; Path=/; HttpOnly; SameSite=Lax;${isProduction ? " Secure;" : ""} Max-Age=0`
  );
  return response;
}
