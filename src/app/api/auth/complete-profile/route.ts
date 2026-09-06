export const dynamic = "force-dynamic";

import { withRateLimit } from "@/lib/rateLimit";

async function handler(req: Request) {
  const { NextResponse } = await import("next/server");
  const bcrypt = await import("bcryptjs");
  const { default: prisma } = await import("@/lib/prisma");

  try {
    const { name, username, email, password, confirmPassword, phone, department, batchYear } = await req.json();

    // Validate required fields
    if (!name || !username || !email || !password || !department || !batchYear) {
      return NextResponse.json({ error: "All required fields must be filled" }, { status: 400 });
    }

    if (!email.endsWith("@kiit.ac.in")) {
      return NextResponse.json({ error: "Only @kiit.ac.in emails are allowed" }, { status: 400 });
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ error: "Passwords do not match" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: "An account already exists with this email. Please login." }, { status: 400 });
    }

    // Check username uniqueness
    const existingUsername = await prisma.user.findUnique({ where: { username } });
    if (existingUsername) {
      return NextResponse.json({ error: "Username already taken" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user — all fields from Google + manual form
    const user = await prisma.user.create({
      data: {
        name,
        username,
        email,
        password: hashedPassword,
        collegeEmail: email,
        phone: phone || null,
        department: department || null,
        batchYear: batchYear ? parseInt(batchYear) : null,
        verified: true, // Google-authenticated users are auto-verified
      },
      select: { id: true, name: true, username: true, email: true },
    });

    return NextResponse.json({
      ...user,
      message: "Account created successfully. You can now login.",
    }, { status: 201 });
  } catch (error) {
    console.error("Complete profile error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Account creation — strict limit against bulk fake-account creation
export const POST = withRateLimit(handler, { windowMs: 60000, maxRequests: 10 });
