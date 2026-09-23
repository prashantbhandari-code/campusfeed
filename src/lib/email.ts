import crypto from "crypto";
import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const BREVO_API_KEY = process.env.BREVO_API_KEY || "";
// Brevo requires a sender that is verified in the Brevo dashboard
// (Senders & IPs -> Senders). e.g. "CampusConnect <your-verified@email.com>"
const BREVO_FROM = process.env.BREVO_FROM || "";
const REQUEST_TIMEOUT_MS = 8000;

const brevoConfigured = () => !!BREVO_API_KEY && !!BREVO_FROM;
const resendConfigured = () => !!RESEND_API_KEY && RESEND_API_KEY !== "re_your_key_here";

export function generateOtp(): string {
  // 6-digit numeric code: 100000..999999
  return crypto.randomInt(100000, 1000000).toString();
}

function otpEmailHtml(name: string | null, otp: string): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #2563eb; font-size: 28px; margin: 0;">🎓 CampusConnect</h1>
      </div>
      <div style="background: #f8fafc; border-radius: 12px; padding: 30px; margin-bottom: 20px;">
        <h2 style="color: #1e293b; font-size: 20px; margin-top: 0;">Reset Your Password</h2>
        <p style="color: #475569; line-height: 1.6;">
          Hi ${name || "there"},<br><br>
          Enter this code on the reset page to choose a new password:
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <span style="display: inline-block; background: #1e293b; color: white; font-size: 36px; font-weight: 700; letter-spacing: 12px; padding: 16px 28px; border-radius: 12px;">
            ${otp}
          </span>
        </div>
        <p style="color: #64748b; font-size: 14px;">
          This code expires in 10 minutes and can be used once. If you didn't request this, you can safely ignore this email.
        </p>
      </div>
      <p style="color: #94a3b8; font-size: 12px; text-align: center;">
        CampusConnect — Your Campus Hub
      </p>
    </div>
  `;
}

/** Pulls the provider's error message out of a failed response. */
async function failureText(res: Response): Promise<string> {
  const body = await res.text().catch(() => "");
  try {
    const parsed = JSON.parse(body);
    return parsed.message || parsed.error || `HTTP ${res.status}`;
  } catch {
    return body.slice(0, 200) || `HTTP ${res.status}`;
  }
}

/** Brevo: POST /v3/smtp/email with the `api-key` header. Returns an error string, or null on success. */
async function postToBrevo(to: string, name: string | null, otp: string): Promise<string | null> {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": BREVO_API_KEY,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender: { name: "CampusConnect", email: BREVO_FROM },
      to: [{ email: to }],
      subject: "Your CampusConnect password reset code",
      htmlContent: otpEmailHtml(name, otp),
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  return res.ok ? null : `${res.status}: ${await failureText(res)}`;
}

export type SendResult = { sent: boolean; provider: "brevo" | "resend" | "dev" | "none" };

/**
 * Delivers the reset OTP. Brevo first (reaches any recipient), Resend as fallback —
 * and Resend is also tried when Brevo is configured but its send fails.
 */
export async function sendOtpEmail(to: string, name: string | null, otp: string): Promise<SendResult> {
  if (brevoConfigured()) {
    const error = await postToBrevo(to, name, otp);
    if (!error) {
      console.log(`Reset OTP sent to ${to} via Brevo`);
      return { sent: true, provider: "brevo" };
    }
    console.error(`Brevo delivery FAILED for ${to} (${error})`);
  }

  if (resendConfigured()) {
    const { error } = await new Resend(RESEND_API_KEY).emails.send({
      from: "CampusConnect <onboarding@resend.dev>",
      to,
      subject: "Your CampusConnect password reset code",
      html: otpEmailHtml(name, otp),
    });
    if (!error) {
      console.log(`Reset OTP sent to ${to} via Resend`);
      return { sent: true, provider: "resend" };
    }
    console.error(`Resend delivery FAILED for ${to}: ${error.name} — ${error.message}`);
  }

  if (!brevoConfigured() && !resendConfigured()) {
    // No provider set up — the code goes to the server log so local dev still works.
    console.log(`[DEV] Password reset OTP for ${to}: ${otp}`);
    return { sent: false, provider: "dev" };
  }

  return { sent: false, provider: "none" };
}

/** Who a provider is able to deliver to. */
export type EmailReach = "all" | "owner-only" | "none";

export type EmailProviderHealth = {
  provider: "brevo" | "resend";
  configured: boolean;
  /** Credentials are valid AND the provider is ready to send. */
  ok: boolean;
  reach: EmailReach;
  detail: string;
};

export type EmailHealth = {
  /** At least one provider can actually send. */
  ok: boolean;
  reach: EmailReach;
  providers: EmailProviderHealth[];
};

function health(provider: "brevo" | "resend", configured: boolean, ok: boolean, reach: EmailReach, detail: string): EmailProviderHealth {
  return { provider, configured, ok, reach, detail };
}

async function probeBrevo(): Promise<EmailProviderHealth> {
  if (!brevoConfigured()) {
    return health("brevo", false, false, "none", "Not configured — BREVO_API_KEY or BREVO_FROM is unset");
  }

  try {
    const headers = { "api-key": BREVO_API_KEY, accept: "application/json" };
    const account = await fetch("https://api.brevo.com/v3/account", {
      headers,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!account.ok) {
      return health("brevo", true, false, "none", `Credentials rejected (${account.status}): ${await failureText(account)}`);
    }

    const sendersRes = await fetch("https://api.brevo.com/v3/senders", {
      headers,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const senders: any[] = sendersRes.ok ? (await sendersRes.json()).senders ?? [] : [];
    const senderVerified = senders.some(
      (s) => s.email?.toLowerCase() === BREVO_FROM.toLowerCase() && s.active
    );
    if (!senderVerified) {
      return health("brevo", true, false, "none", `Key is valid, but ${BREVO_FROM} is not an active verified sender`);
    }

    return health("brevo", true, true, "all", `Sending as ${BREVO_FROM}`);
  } catch (error: any) {
    return health("brevo", true, false, "none", `Check failed: ${error?.message ?? "unknown error"}`);
  }
}

async function probeResend(): Promise<EmailProviderHealth> {
  if (!resendConfigured()) {
    return health("resend", false, false, "none", "Not configured — RESEND_API_KEY is unset");
  }

  try {
    const res = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${RESEND_API_KEY}` },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) {
      return health("resend", true, false, "none", `Credentials rejected (${res.status}): ${await failureText(res)}`);
    }

    const domains: any[] = (await res.json()).data ?? [];
    const verified = domains.filter((d) => d.status === "verified");
    if (verified.length === 0) {
      return health(
        "resend",
        true,
        true,
        "owner-only",
        "Key is valid, but no verified domain — the sandbox only delivers to the account owner's own address"
      );
    }

    return health("resend", true, true, "all", `Key is valid · ${verified.length} verified domain(s)`);
  } catch (error: any) {
    return health("resend", true, false, "none", `Check failed: ${error?.message ?? "unknown error"}`);
  }
}

/**
 * Live check of every configured email provider — makes real API calls, so it
 * catches a revoked key or an unverified sender rather than just missing config.
 */
export async function checkEmailHealth(): Promise<EmailHealth> {
  const providers = await Promise.all([probeBrevo(), probeResend()]);
  const reach: EmailReach = providers.some((p) => p.reach === "all")
    ? "all"
    : providers.some((p) => p.reach === "owner-only")
      ? "owner-only"
      : "none";

  return { ok: reach !== "none", reach, providers };
}
