import { describe, it, expect, beforeEach } from "vitest";

// ice-servers.ts is the auth boundary for call relay credentials: the signed
// Cloudflare path must never leak the secret client-side, and the resolution
// order decides which relay real calls use. These tests pin both.

import {
  signTurnCredential,
  getIceServers,
  DEFAULT_ICE_SERVERS,
  CLOUDFLARE_TURN_URLS,
  TURN_TTL_SECONDS,
} from "@/lib/ice-servers";

const KEY = "CLOUDFLARE_TURN_TOKEN_ID";
const SECRET = "CLOUDFLARE_TURN_TOKEN_SECRET";
const OVERRIDE = "NEXT_PUBLIC_ICE_SERVERS";

beforeEach(() => {
  delete process.env[KEY];
  delete process.env[SECRET];
  delete process.env[OVERRIDE];
});

describe("signTurnCredential", () => {
  it("builds the <expiry>.<keyId> username with the configured TTL", () => {
    const now = 1_760_000_000_000;
    const { username } = signTurnCredential("key123", "c2VjcmV0", now);
    const [expiry, id] = username.split(".");
    expect(id).toBe("key123");
    expect(Number(expiry)).toBe(Math.floor(now / 1000) + TURN_TTL_SECONDS);
  });

  it("emits a base64 credential that decodes to a 32-byte HMAC", () => {
    const { credential } = signTurnCredential("key123", Buffer.from("s3cret").toString("base64"));
    const decoded = Buffer.from(credential, "base64");
    expect(decoded.length).toBe(32);
  });

  it("decodes 64-char hex secrets as hex (Cloudflare's format)", () => {
    const hexSecret = Buffer.from("cf-turn-secret-bytes").toString("hex").padEnd(64, "0").slice(0, 64);
    const { username, credential } = signTurnCredential("key123", hexSecret, 1_760_000_000_000);
    // same key material as its base64 twin → identical signature
    const twin = signTurnCredential("key123", Buffer.from(hexSecret, "hex").toString("base64"), 1_760_000_000_000);
    expect(username).toBe(twin.username);
    expect(credential).toBe(twin.credential);
  });

  it("is deterministic per input and time-sensitive", () => {
    const a = signTurnCredential("k", "c2VjcmV0", 1_000_000_000);
    const b = signTurnCredential("k", "c2VjcmV0", 1_000_000_000);
    const c = signTurnCredential("k", "c2VjcmV0", 2_000_000_000);
    expect(a).toEqual(b);
    expect(a.username).not.toEqual(c.username);
  });
});

describe("getIceServers resolution order", () => {
  it("falls back to the static defaults with no env configured", () => {
    expect(getIceServers()).toEqual(DEFAULT_ICE_SERVERS);
  });

  it("signs Cloudflare credentials when key + secret are set", () => {
    process.env[KEY] = "kid";
    process.env[SECRET] = Buffer.from("s3cret").toString("base64");
    const servers = getIceServers();
    expect(servers).toHaveLength(1);
    expect(servers[0].username).toMatch(/^\d+\.kid$/);
    expect(servers[0].urls).toEqual(CLOUDFLARE_TURN_URLS);
  });

  it("lets an explicit NEXT_PUBLIC_ICE_SERVERS override win over Cloudflare", () => {
    process.env[KEY] = "kid";
    process.env[SECRET] = Buffer.from("s3cret").toString("base64");
    process.env[OVERRIDE] = JSON.stringify([{ urls: "stun:override.example" }]);
    expect(getIceServers()).toEqual([{ urls: "stun:override.example" }]);
  });

  it("treats a malformed override as absent", () => {
    process.env[OVERRIDE] = "{not json";
    expect(getIceServers()).toEqual(DEFAULT_ICE_SERVERS);
  });
});
