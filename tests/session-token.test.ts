import { describe, it, expect, beforeAll } from "vitest";
import { createSessionToken, verifySessionToken, getUserIdFromCookieHeader } from "@/lib/auth/session-token";

beforeAll(() => {
  process.env.SESSION_SECRET = "test-secret-for-vitest";
});

describe("session-token", () => {
  it("round-trips a valid token back to the userId", () => {
    const token = createSessionToken("user-123");
    expect(verifySessionToken(token)).toBe("user-123");
  });

  it("rejects a token signed with a different secret", () => {
    const token = createSessionToken("user-123");
    process.env.SESSION_SECRET = "other-secret";
    expect(verifySessionToken(token)).toBeNull();
    process.env.SESSION_SECRET = "test-secret-for-vitest";
  });

  it("rejects a tampered userId (signature mismatch)", () => {
    const token = createSessionToken("user-123");
    const parts = token.split(".");
    const forged = ["admin", parts[1], parts[2]].join(".");
    expect(verifySessionToken(forged)).toBeNull();
  });

  it("rejects expired tokens", () => {
    // Hand-build an expired-but-validly-signed token
    const crypto = require("crypto");
    const payload = "user-123." + (Math.floor(Date.now() / 1000) - 10);
    const sig = crypto.createHmac("sha256", "test-secret-for-vitest").update(payload).digest("hex");
    expect(verifySessionToken(`${payload}.${sig}`)).toBeNull();
  });

  it("rejects garbage and empty input", () => {
    expect(verifySessionToken(null)).toBeNull();
    expect(verifySessionToken("")).toBeNull();
    expect(verifySessionToken("not-a-token")).toBeNull();
    expect(verifySessionToken("a.b")).toBeNull();
  });

  it("extracts the userId from a raw Cookie header", () => {
    const token = encodeURIComponent(createSessionToken("user-abc"));
    expect(getUserIdFromCookieHeader(`foo=bar; cc_session=${token}; baz=qux`)).toBe("user-abc");
  });

  it("returns null when cc_session is absent from the header", () => {
    expect(getUserIdFromCookieHeader("foo=bar")).toBeNull();
    expect(getUserIdFromCookieHeader("")).toBeNull();
    expect(getUserIdFromCookieHeader(null)).toBeNull();
  });
});
