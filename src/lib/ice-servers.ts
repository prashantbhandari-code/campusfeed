import crypto from "crypto";

// STUN/TURN resolution for WebRTC calls.
//
// Same-network calls connect via host candidates alone. Across two CGNAT
// networks (mobile data, campus WiFi) the only viable path is a TURN relay —
// and the free OpenRelay default no longer issues relay candidates, which is
// why cross-network calls died at "Connecting...". Resolution order:
//
// 1. NEXT_PUBLIC_ICE_SERVERS → verbatim JSON array (explicit full override)
// 2. CLOUDFLARE_TURN_TOKEN_ID + CLOUDFLARE_TURN_TOKEN_SECRET → signed,
//    time-limited Cloudflare Calls TURN credentials (1TB/month free tier;
//    the secret never leaves the server)
// 3. Static defaults: Google/Cloudflare STUN + the legacy free relay

export const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  {
    urls: [
      "stun:stun.l.google.com:19302",
      "stun:stun1.l.google.com:19302",
      "stun:stun.cloudflare.com:3478",
    ],
  },
  {
    urls: [
      "turn:openrelay.metered.ca:80",
      "turn:openrelay.metered.ca:443",
      "turn:openrelay.metered.ca:443?transport=tcp",
    ],
    username: "openrelayproject",
    credential: "openrelayproject",
  },
];

// Cloudflare Calls TURN endpoints (from the TURN app in the CF dashboard)
export const CLOUDFLARE_TURN_URLS = [
  "turn:standard.turn.cloudflare.com:3478?transport=udp",
  "turn:standard.turn.cloudflare.com:443?transport=tcp",
  "turns:standard.turn.cloudflare.com:443?transport=tcp",
];

// Credentials stay valid 6h — far longer than any call, short enough that a
// leaked client credential is worthless.
export const TURN_TTL_SECONDS = 6 * 60 * 60;

// Cloudflare scheme: username = "<unix-expiry>.<key-id>", credential =
// base64(HMAC-SHA256(base64-decoded(secret), username)).
export function signTurnCredential(
  keyId: string,
  secret: string,
  now = Date.now()
): { username: string; credential: string } {
  const expiry = Math.floor(now / 1000) + TURN_TTL_SECONDS;
  const username = `${expiry}.${keyId}`;
  const credential = crypto
    .createHmac("sha256", Buffer.from(secret, "base64"))
    .update(username)
    .digest("base64");
  return { username, credential };
}

export function getIceServers(): RTCIceServer[] {
  // Explicit full-list override wins — it's the "I know exactly what I want"
  // escape hatch (also lets a static provider list beat the signed default).
  const override = process.env.NEXT_PUBLIC_ICE_SERVERS;
  if (override) {
    try {
      const parsed = JSON.parse(override);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {
      // malformed override — fall through to the signed/static paths
    }
  }

  const keyId = process.env.CLOUDFLARE_TURN_TOKEN_ID || "";
  const secret = process.env.CLOUDFLARE_TURN_TOKEN_SECRET || "";
  if (keyId && secret) {
    const { username, credential } = signTurnCredential(keyId, secret);
    return [{ urls: CLOUDFLARE_TURN_URLS, username, credential }];
  }

  return DEFAULT_ICE_SERVERS;
}
