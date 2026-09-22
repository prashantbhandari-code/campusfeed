import { createSessionToken } from "./session-token";

function flags(maxAge: number): string {
  const secure = process.env.NODE_ENV === "production" ? " Secure;" : "";
  return `; Path=/; HttpOnly; SameSite=Lax;${secure} Max-Age=${maxAge}`;
}

/** Single owner of the app session cookie name + flags. */
export function sessionCookie(token: string, maxAge: number = 31536000): string {
  return `cc_session=${token}${flags(maxAge)}`;
}

/** Set-Cookie value for a fresh signed session for the given user id. */
export function createSessionCookie(userId: string): string {
  return sessionCookie(createSessionToken(userId));
}

/**
 * Re-emit an upstream cookie (e.g. Appwrite's session) with our standard
 * flags, preserving its original name=value pair.
 */
export function forwardedCookie(rawNameValue: string, maxAge: number = 31536000): string {
  return rawNameValue + flags(maxAge);
}

/** Set-Cookie value that clears the session cookie. */
export function clearSessionCookie(): string {
  return sessionCookie("", 0);
}
