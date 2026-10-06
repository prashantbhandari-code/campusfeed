import crypto from "crypto";

// STUN/TURN resolution for WebRTC calls.
//
// Same-network calls connect via host candidates alone. Across two CGNAT
// networks (mobile data, campus WiFi) the only viable path is a TURN relay —
// and the free OpenRelay default no longer issues relay candidates, which is
// why cross-network calls died at "Connecting...". Resolution order:
//
// 1. NEXT_PUBLIC_ICE_SERVERS → verbatim JSON array (explicit full override)
// 2. CLOUDFLARE_TURN_TOKEN_ID (key uid) + CLOUDFLARE_TURN_TOKEN_SECRET →
//    proxy Cloudflare's official credentials endpoint: it returns ready-to-use
//    iceServers (stun.cloudflare.com + turn.cloudflare.com, all transports)
//    with an opaque username/password valid for the requested ttl. The key
//    secret is the Bearer for this call and never reaches the browser.
//    NOTE: the credentials endpoint lives on rtc.live.cloudflare.com (the
//    Realtime data plane) and only accepts the TURN key secret — regular API
//    tokens are rejected there, and the old standard.turn host is dead.
// 3. Static defaults: Google/Cloudflare STUN + the legacy free relay

const TURN_TTL_SECONDS = 86_400; // 24h — comfortably longer than any session

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

export async function getIceServers(): Promise<RTCIceServer[]> {
  // Explicit full-list override wins without touching the network.
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
    try {
      const res = await fetch(
        `https://rtc.live.cloudflare.com/v1/turn/keys/${keyId}/credentials/generate-ice-servers`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${secret}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ttl: TURN_TTL_SECONDS }),
          signal: AbortSignal.timeout(8_000),
        }
      );
      if (res.ok) {
        const data = await res.json();
        const servers = data?.iceServers;
        if (Array.isArray(servers) && servers.length > 0) return servers;
      }
      // non-OK or unexpected shape — fall through to defaults
    } catch {
      // network/timeout — fall through to defaults
    }
  }

  return DEFAULT_ICE_SERVERS;
}

// Kept for the crypto import contract used by tests (hex/base64 handling of
// provider secrets); no longer used for credential signing itself.
export function hmacSha1Base64(key: Buffer, message: string): string {
  return crypto.createHmac("sha1", key).update(message).digest("base64");
}
