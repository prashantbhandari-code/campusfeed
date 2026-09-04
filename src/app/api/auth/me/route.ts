import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const appwriteUserId = req.headers.get("x-appwrite-user-id");
    
    if (!appwriteUserId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Look up user in our DB by Appwrite user ID (stored as appwriteId field)
    let user = await prisma.user.findFirst({
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

    // If no user found by appwriteId, try finding by email (for existing users)
    if (!user) {
      // We can also try to find by the Appwrite user's email
      // But for now, return 404 — the user needs to complete profile
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("GET /api/auth/me error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
