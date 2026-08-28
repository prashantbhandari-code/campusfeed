import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { generateVerificationToken, sendVerificationEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const { name, username, email, password, rollNumber, department, batchYear } = await req.json();

    if (!name || !username || !email || !password) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    // KIIT email gate
    if (!email.endsWith("@kiit.ac.in")) {
      return NextResponse.json(
        { error: "Only @kiit.ac.in college emails are allowed" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }, ...(rollNumber ? [{ rollNumber }] : [])] },
    });

    if (existingUser) {
      if (existingUser.email === email) {
        return NextResponse.json({ error: "Email already taken" }, { status: 400 });
      }
      if (existingUser.username === username) {
        return NextResponse.json({ error: "Username already taken" }, { status: 400 });
      }
      return NextResponse.json({ error: "Roll number already registered" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        username,
        email,
        password: hashedPassword,
        collegeEmail: email,
        rollNumber: rollNumber || null,
        department: department || null,
        batchYear: batchYear ? parseInt(batchYear) : null,
      },
      select: { id: true, name: true, username: true, email: true },
    });

    // Send verification email
    try {
      const token = await generateVerificationToken(email);
      await sendVerificationEmail(email, token);
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError);
      // Don't fail registration if email fails
    }

    return NextResponse.json({ ...user, message: "Verification email sent" }, { status: 201 });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
