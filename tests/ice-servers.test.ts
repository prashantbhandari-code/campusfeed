import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// ice-servers.ts proxies Cloudflare's official TURN credentials endpoint
// (rtc.live.cloudflare.com) with the key secret as Bearer, so the secret never
// reaches the browser. These tests pin the resolution order and the proxy.

const KEY = "CLOUDFLARE_TURN_TOKEN_ID";
const SECRET = "CLOUDFLARE_TURN_TOKEN_SECRET";
const OVERRIDE = "NEXT_PUBLIC_ICE_SERVERS";
const KEY_ID = "02d39bf2345240d4cca0ced08a104020";

beforeEach(() => {
  delete process.env[KEY];
  delete process.env[SECRET];
  delete process.env[OVERRIDE];
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getIceServers resolution order", () => {
  it("falls back to the static defaults with no env configured (no fetch)", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const { getIceServers } = await import("@/lib/calls/ice-servers");
    const { DEFAULT_ICE_SERVERS } = await import("@/lib/calls/ice-servers");
    expect(await getIceServers()).toEqual(DEFAULT_ICE_SERVERS);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("lets an explicit NEXT_PUBLIC_ICE_SERVERS override win without fetching", async () => {
    process.env[OVERRIDE] = JSON.stringify([{ urls: "stun:override.example" }]);
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const { getIceServers } = await import("@/lib/calls/ice-servers");
    expect(await getIceServers()).toEqual([{ urls: "stun:override.example" }]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("proxies Cloudflare's credentials endpoint when key + secret are set", async () => {
    process.env[KEY] = KEY_ID;
    process.env[SECRET] = "test-key-secret";
    const cfIceServers = [
      { urls: ["stun:stun.cloudflare.com:3478"] },
      { urls: ["turn:turn.cloudflare.com:3478?transport=udp"], username: "opaque", credential: "pair" },
    ];
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ iceServers: cfIceServers }),
    });
    vi.stubGlobal("fetch", fetchSpy);
    const { getIceServers } = await import("@/lib/calls/ice-servers");
    expect(await getIceServers()).toEqual(cfIceServers);

    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe(
      `https://rtc.live.cloudflare.com/v1/turn/keys/${KEY_ID}/credentials/generate-ice-servers`
    );
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe("Bearer test-key-secret");
    expect(JSON.parse(init.body)).toEqual({ ttl: 86_400 });
  });

  it("falls back to defaults when Cloudflare returns a non-OK response", async () => {
    process.env[KEY] = KEY_ID;
    process.env[SECRET] = "test-key-secret";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }));
    const mod = await import("@/lib/calls/ice-servers");
    expect(await mod.getIceServers()).toEqual(mod.DEFAULT_ICE_SERVERS);
  });

  it("falls back to defaults when the fetch itself throws", async () => {
    process.env[KEY] = KEY_ID;
    process.env[SECRET] = "test-key-secret";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    const mod = await import("@/lib/calls/ice-servers");
    expect(await mod.getIceServers()).toEqual(mod.DEFAULT_ICE_SERVERS);
  });

  it("treats a malformed NEXT_PUBLIC_ICE_SERVERS override as absent", async () => {
    process.env[OVERRIDE] = "{not json";
    const mod = await import("@/lib/calls/ice-servers");
    expect(await mod.getIceServers()).toEqual(mod.DEFAULT_ICE_SERVERS);
  });
});
