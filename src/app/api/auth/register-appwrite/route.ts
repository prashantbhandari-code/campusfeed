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

    // Google-managed accounts don't choose a password — use a placeholder
    // that the user can replace later via 'Set a Password' (forgot-password).
    const passwordToHash =
      body.password && body.password.length >= 6
        ? body.password
        : "google-managed-auto-" + Math.random().toString(36).slice(2);
    const hashedPassword = await bcrypt.hash(passwordToHash, 10);

    const user = await prisma.user.create({
      data: {
        appwriteId,
        name: name || "",
        username: username || generateUsername(name || email),
        email,
        password: hashedPassword,
        phone: phone || null,
        department: department || null,
        batchYear: batchYear ? parseInt(batchYear) : null,
        collegeEmail: email,
        verified: true, // Google-authenticated users are auto-verified
      },
      select: { id: true, name: true, email: true, username: true },
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

// Auto-generate a readable username from a name when the callback passes
// only the Appwrite profile (no manual input).
function generateUsername(fullName: string): string {
  const base = fullName
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^[^a-z0-9]+/, "")
    .replace(/[^a-z0-9]+$/, "")
    .trim();
  const short = base.slice(0, 16) || "user";
  const suffix = Math.floor(1000 + Math.random() * 8999);
  return `${short}_${suffix}`;
}

// Account creation — strict limit against bulk fake-account creation
export const POST = withRateLimit(handler, { windowMs: 60000, maxRequests: 10 });
