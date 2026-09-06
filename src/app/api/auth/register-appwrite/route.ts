import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { withRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

async function handler(req: Request) {
  try {
    const body = await req.json();
    const { appwriteId, name, username, email, phone, department, batchYear } = body;

    if (!appwriteId || !name || !username || !email) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if username is already taken
    const existingUsername = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUsername) {
      return NextResponse.json(
        { error: "Username already taken" },
        { status: 400 }
      );
    }

    // Check if email is already registered
    const existingEmail = await prisma.user.findUnique({
      where: { email },
    });

    if (existingEmail) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 400 }
      );
    }

    // Create user with a placeholder password (Appwrite handles auth)
    const placeholderPassword = await bcrypt.hash("appwrite-managed", 10);

    const user = await prisma.user.create({
      data: {
        appwriteId,
        name,
        username,
        email,
        password: placeholderPassword,
        phone: phone || null,
        department: department || null,
        batchYear: batchYear || null,
        collegeEmail: email,
        verified: true, // Appwrite email/password accounts are auto-verified
      },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error("POST /api/auth/register-appwrite error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Account creation — strict limit against bulk fake-account creation
export const POST = withRateLimit(handler, { windowMs: 60000, maxRequests: 10 });
