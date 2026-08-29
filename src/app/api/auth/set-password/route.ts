export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { NextResponse } = await import("next/server");
  const bcrypt = await import("bcryptjs");
  const { default: prisma } = await import("@/lib/prisma");

  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    if (!email.endsWith("@kiit.ac.in")) {
      return NextResponse.json({ error: "Only @kiit.ac.in emails are allowed" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    // Find the user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: "No account found with this email. Please create an account first." }, { status: 404 });
    }

    // Hash and save password
    const hashedPassword = await bcrypt.hash(password, 12);

    await prisma.user.update({
      where: { email },
      data: { password: hashedPassword },
    });

    return NextResponse.json({
      message: "Password set successfully. You can now login with email & password.",
    }, { status: 200 });
  } catch (error) {
    console.error("Set password error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
