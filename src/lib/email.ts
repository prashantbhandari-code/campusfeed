import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendVerificationEmail(email: string, token: string) {
  const verifyUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3001"}/verify?token=${token}`;

  await resend.emails.send({
    from: "CampusConnect <onboarding@resend.dev>",
    to: email,
    subject: "Verify your CampusConnect account",
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #0a0a0a; color: #fff;">
        <div style="text-align: center; padding: 40px 20px;">
          <h1 style="font-size: 28px; margin-bottom: 8px;">🎓 CampusConnect</h1>
          <p style="color: #888; margin-bottom: 30px;">Verify your email to join KIIT's campus network</p>
          
          <div style="background: #1a1a2e; border-radius: 16px; padding: 40px 30px; margin-bottom: 30px;">
            <h2 style="font-size: 20px; margin-bottom: 16px;">Verify your email</h2>
            <p style="color: #aaa; margin-bottom: 24px;">Click the button below to verify your @kiit.ac.in email and start using CampusConnect.</p>
            
            <a href="${verifyUrl}" 
               style="display: inline-block; background: #2563eb; color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 16px;">
              Verify Email →
            </a>
          </div>
          
          <p style="color: #666; font-size: 13px;">
            If you didn't create an account, you can ignore this email.
          </p>
        </div>
      </body>
      </html>
    `,
  });
}

export async function generateVerificationToken(email: string): Promise<string> {
  const crypto = await import("crypto");
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  // Delete old tokens for this email
  const prisma = (await import("./prisma")).default;
  await prisma.verificationToken.deleteMany({
    where: { email, type: "email_verify" },
  });

  // Create new token
  await prisma.verificationToken.create({
    data: { email, token, type: "email_verify", expiresAt },
  });

  return token;
}
