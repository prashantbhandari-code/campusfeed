/**
 * Public origin of the current request.
 *
 * Behind a reverse proxy (Render's load balancer) `new URL(req.url).origin`
 * is the internal bind address — `https://localhost:10000` on Render — and
 * that value was being sent to Google as the OAuth `redirect_uri`, so every
 * sign-in bounced the browser to the user's own localhost after consent.
 *
 * Prefer the proxy's X-Forwarded-Host / X-Forwarded-Proto, then the Host
 * header, and only fall back to the URL's own origin (local dev, where no
 * forwarded headers exist and the origin is already correct). The protocol
 * falls back to the URL's own scheme rather than assuming https, so plain
 * http local dev keeps working.
 */
export function publicOrigin(req: Request, fallback: URL): string {
  const forwardedHost = req.headers.get("x-forwarded-host");
  const hostHeader = req.headers.get("host");
  const host = forwardedHost || hostHeader;
  if (host) {
    const proto =
      req.headers.get("x-forwarded-proto") || fallback.protocol.replace(/:$/, "");
    return `${proto}://${host.split(",")[0].trim()}`;
  }
  return fallback.origin;
}
