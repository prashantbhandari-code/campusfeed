import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { getUserIdFromCookieHeader } from "@/lib/auth/session-token";

export const dynamic = "force-dynamic";

/**
 * Resolves the current user profile from the signed cc_session cookie.
 *
 * The old `x-appwrite-user-id` header path was removed: it accepted any
 * client-supplied Appwrite ID without verification, so anyone could fetch
 * another user's profile by setting the header. Identity now comes only from
 * the server-set signed cookie, which every login path establishes via
 * the login / Google OAuth flows.
 */
export async function GET(req: Request) {
  try {
    const ccUserId = getUserIdFromCookieHeader(req.headers.get("cookie"));

    if (!ccUserId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: ccUserId },
      select: {
        id: true, name: true, email: true, username: true,
        avatar: true, department: true, batchYear: true,
        rollNumber: true, collegeEmail: true, role: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("GET /api/auth/me error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
