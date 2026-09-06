import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const appwriteUserId = req.headers.get("x-appwrite-user-id");

    // Check cc_session cookie as fallback
    const cookieHeader = req.headers.get("cookie") || "";
    const ccMatch = cookieHeader.match(/cc_session=([^;]+)/);
    const ccUserId = ccMatch ? ccMatch[1] : null;

    if (!appwriteUserId && !ccUserId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Look up user: try appwriteId first, then cc_session userId
    let user = null;
    if (appwriteUserId) {
      user = await prisma.user.findFirst({
        where: { appwriteId: appwriteUserId },
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          avatar: true,
          department: true,
          batchYear: true,
          rollNumber: true,
          collegeEmail: true,
        },
      });
    }

    // Fallback: try cc_session cookie (PostgreSQL user ID)
    if (!user && ccUserId) {
      user = await prisma.user.findUnique({
        where: { id: ccUserId },
        select: {
          id: true, name: true, email: true, username: true,
          avatar: true, department: true, batchYear: true,
          rollNumber: true, collegeEmail: true,
        },
      });
    }

    if (!user) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("GET /api/auth/me error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
