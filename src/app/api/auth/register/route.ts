export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  // All imports deferred to runtime — avoids build-time DB connection
  const { NextResponse } = await import("next/server");
  const bcrypt = await import("bcryptjs");
  const { default: prisma } = await import("@/lib/prisma");
  const { generateVerificationToken, sendVerificationEmail } = await import("@/lib/email");
  const { withRateLimit } = await import("@/lib/rateLimit");

  // Rate limit: 5 registrations per hour per IP
  const rateLimitedHandler = withRateLimit(async (req: Request) => {
    try {
      const { name, username, email, password, confirmPassword, phone, department, batchYear } = await req.json();

      if (!name || !username || !email || !password || !confirmPassword || !department || !batchYear) {
        return NextResponse.json({ error: "All required fields must be filled" }, { status: 400 });
      }

      if (password !== confirmPassword) {
        return NextResponse.json({ error: "Passwords do not match" }, { status: 400 });
      }

      if (!email.endsWith("@kiit.ac.in")) {
        return NextResponse.json(
          { error: "Only @kiit.ac.in college emails are allowed" },
          { status: 400 }
        );
      }

      // Strong password validation
      if (password.length < 8) {
        return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
      }
      if (!/[A-Z]/.test(password)) {
        return NextResponse.json({ error: "Password must contain at least one uppercase letter" }, { status: 400 });
      }
      if (!/[a-z]/.test(password)) {
        return NextResponse.json({ error: "Password must contain at least one lowercase letter" }, { status: 400 });
      }
      if (!/[0-9]/.test(password)) {
        return NextResponse.json({ error: "Password must contain at least one number" }, { status: 400 });
      }

      // Username validation
      if (username.length < 3 || username.length > 20) {
        return NextResponse.json({ error: "Username must be 3-20 characters" }, { status: 400 });
      }
      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        return NextResponse.json({ error: "Username can only contain letters, numbers, and underscores" }, { status: 400 });
      }

      // Name validation — strip HTML
      const sanitizedName = name.replace(/<[^>]*>/g, "").trim();
      if (sanitizedName.length < 2 || sanitizedName.length > 50) {
        return NextResponse.json({ error: "Name must be 2-50 characters" }, { status: 400 });
      }

      const existingEmail = await prisma.user.findUnique({ where: { email } });
      if (existingEmail) {
        return NextResponse.json({ error: "Email already registered" }, { status: 400 });
      }

      const existingUsername = await prisma.user.findUnique({ where: { username } });
      if (existingUsername) {
        return NextResponse.json({ error: "Username already taken" }, { status: 400 });
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      const user = await prisma.user.create({
        data: {
          name: sanitizedName,
          username,
          email,
          password: hashedPassword,
          collegeEmail: email,
          phone: phone || null,
          department: department || null,
          batchYear: batchYear ? parseInt(batchYear) : null,
        },
        select: { id: true, name: true, username: true, email: true },
      });

      try {
        const token = await generateVerificationToken(email);
        await sendVerificationEmail(email, token);
      } catch (emailError) {
        console.error("Failed to send verification email:", emailError);
      }

      return NextResponse.json({ ...user, message: "Verification email sent" }, { status: 201 });
    } catch (error) {
      console.error("Registration error:", error);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  }, { windowMs: 3600000, maxRequests: 5 }); // 5 per hour

  return rateLimitedHandler(req);
}
