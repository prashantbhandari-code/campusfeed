import crypto from "crypto";

/**
 * HMAC-signed session token for the cc_session cookie.
 *
 * The old cc_session cookie contained the raw PostgreSQL user ID, which meant
 * anyone who learned a user's ID could impersonate them (IDs are exposed by
 * user search). The token is now `userId.timestamp.signature` where signature
 * is an HMAC-SHA256 over the payload with a server-side secret.
 *
 * Secret precedence: SESSION_SECRET > NEXTAUTH_SECRET.
 *
 * APPWRITE_API_KEY is deliberately NOT accepted as a fallback. It is an
 * Appwrite storage credential, not a session-signing secret, so accepting it
 * meant a leaked file-storage key could also forge sessions — and rotating it
 * would silently invalidate every signed-in user.
 *
 * The literal `[SENSITIVE]` placeholder is rejected too: that value is written
 * into env files by tooling that cannot read real secrets, and signing
 * sessions with a publicly known string would let anyone mint a valid token.
 */
const PLACEHOLDER = "[SENSITIVE]";

function getSecret(): string {
  const secret =
    process.env.SESSION_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "";
  if (!secret || secret === PLACEHOLDER) {
    throw new Error(
      "No usable session secret configured: set SESSION_SECRET or NEXTAUTH_SECRET to a real value"
    );
  }
  return secret;
}

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

function sign(payload: string): string {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("hex");
}

export function createSessionToken(userId: string): string {
  const expiresAt = Math.floor(Date.now() / 1000) + ONE_YEAR_SECONDS;
  const payload = `${userId}.${expiresAt}`;
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string | undefined | null): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [userId, expiresAtStr, signature] = parts;

  // Constant-time signature comparison
  const expected = sign(`${userId}.${expiresAtStr}`);
  const sigOk =
    signature.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  if (!sigOk) return null;

  const expiresAt = parseInt(expiresAtStr, 10);
  if (!Number.isFinite(expiresAt) || expiresAt < Math.floor(Date.now() / 1000)) {
    return null;
  }

  return userId;
}

/** Parse the signed cc_session cookie value from a raw Cookie header. */
export function getUserIdFromCookieHeader(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/(?:^|;\s*)cc_session=([^;]+)/);
  if (!match) return null;
  return verifySessionToken(decodeURIComponent(match[1]));
}
