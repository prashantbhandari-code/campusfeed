import { createSessionToken } from "./session-token";

/**
 * Short-lived cookie that binds an OAuth `state` value to the browser that
 * started the flow. Without it the Google callback has no CSRF defence: an
 * attacker can hand the victim a `code` of their own and silently sign them
 * into the attacker's account.
 */
export const OAUTH_STATE_COOKIE = "cc_oauth_state";

/** Read a single cookie value out of a raw Cookie header. */
export function readCookie(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${escaped}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/** Set-Cookie value carrying an OAuth state value (10 minute lifetime). */
export function oauthStateCookie(state: string, maxAge: number = 600): string {
  return `${OAUTH_STATE_COOKIE}=${state}${flags(maxAge)}`;
}

/** Set-Cookie value that clears the OAuth state cookie once it is spent. */
export function clearOauthStateCookie(): string {
  return `${OAUTH_STATE_COOKIE}=${flags(0)}`;
}

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
