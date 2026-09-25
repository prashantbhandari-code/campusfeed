export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { withRateLimit } from "@/lib/rateLimit";
import { parseBody, registerSchema } from "@/lib/validation";

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

async function handler(req: Request) {
  try {
    const parsed = await parseBody(req, registerSchema);
    if (!parsed.ok) return parsed.response;
    const { name, username, email, password, phone, department, batchYear } = parsed.data;

    // Business rule stays in the handler: schema validates shape/length,
    // this validates the campus-domain policy.
    if (!email.endsWith("@kiit.ac.in")) {
      return NextResponse.json(
        { error: "Only @kiit.ac.in emails are allowed" },
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

    // Generate username if not provided
    const finalUsername = username || generateUsername(name);

    // Check if username is already taken
    const existingUsername = await prisma.user.findUnique({
      where: { username: finalUsername },
    });

    if (existingUsername) {
      // Try with a different suffix
      const altUsername = generateUsername(name);
      const altExisting = await prisma.user.findUnique({
        where: { username: altUsername },
      });
      if (altExisting) {
        return NextResponse.json(
          { error: "Username already taken. Please choose another." },
          { status: 400 }
        );
      }
      // Hash password and create user
      const hashedPassword = await bcrypt.hash(password, 12);
      const user = await prisma.user.create({
        data: {
          name,
          username: altUsername,
          email,
          password: hashedPassword,
          phone: phone || null,
          department: department || null,
          batchYear: batchYear ?? null,
          collegeEmail: email,
          verified: true,
        },
        select: { id: true, name: true, email: true, username: true },
      });
      return NextResponse.json(user, { status: 201 });
    }

    // Hash password and create user
    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        name,
        username: finalUsername,
        email,
        password: hashedPassword,
        phone: phone || null,
        department: department || null,
        batchYear: batchYear ?? null,
        collegeEmail: email,
        verified: true,
      },
      select: { id: true, name: true, email: true, username: true },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error("POST /api/auth/register error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export const POST = withRateLimit(handler, { windowMs: 60000, maxRequests: 10 });
