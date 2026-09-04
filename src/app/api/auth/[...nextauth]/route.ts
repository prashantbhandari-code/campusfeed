export const dynamic = "force-dynamic";

// NextAuth route handler removed — Appwrite auth is now used instead.
// This file is kept to prevent 404 on old OAuth callback URLs.
// All auth is now handled via Appwrite SDK (client-side) and /api/auth/me (server-side).

import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.redirect(new URL("/login", process.env.NEXTAUTH_URL || "http://localhost:3001"));
}

export function POST() {
  return NextResponse.redirect(new URL("/login", process.env.NEXTAUTH_URL || "http://localhost:3001"));
}
