import { describe, it, expect } from "vitest";
import { stashIceCandidate, attachIceConsumer, detachIceConsumer } from "@/lib/calls/call-signals";

describe("call-signals ICE buffer", () => {
  it("parks candidates when no consumer is attached", () => {
    stashIceCandidate("peer-1", { candidate: "cand-a" } as any);
    stashIceCandidate("peer-1", { candidate: "cand-b" } as any);
    const drained = attachIceConsumer("peer-1", () => {});
    expect(drained.map((c) => c.candidate)).toEqual(["cand-a", "cand-b"]);
    detachIceConsumer("peer-1");
  });

  it("delivers candidates live once a consumer is attached", () => {
    const received: any[] = [];
    attachIceConsumer("peer-2", (c) => received.push(c));
    stashIceCandidate("peer-2", { candidate: "cand-live" } as any);
    expect(received).toEqual([{ candidate: "cand-live" }]);
    detachIceConsumer("peer-2");
  });

  it("keeps per-peer buffers isolated", () => {
    stashIceCandidate("alice", { candidate: "a" } as any);
    stashIceCandidate("bob", { candidate: "b" } as any);
    const drainedAlice = attachIceConsumer("alice", () => {});
    expect(drainedAlice.map((c) => c.candidate)).toEqual(["a"]);
    detachIceConsumer("alice");
    const drainedBob = attachIceConsumer("bob", () => {});
    expect(drainedBob.map((c) => c.candidate)).toEqual(["b"]);
    detachIceConsumer("bob");
  });

  it("ignores malformed events (missing peer or candidate)", () => {
    expect(() => stashIceCandidate(undefined, { candidate: "x" } as any)).not.toThrow();
    expect(() => stashIceCandidate("peer-3", undefined)).not.toThrow();
    const drained = attachIceConsumer("peer-3", () => {});
    expect(drained).toHaveLength(0);
    detachIceConsumer("peer-3");
  });

  it("caps the buffer so a hostile peer cannot grow it unboundedly", () => {
    for (let i = 0; i < 200; i++) stashIceCandidate("flood", { candidate: `c${i}` } as any);
    const drained = attachIceConsumer("flood", () => {});
    expect(drained.length).toBeLessThanOrEqual(60);
    detachIceConsumer("flood");
  });

  it("a consumer attach replaces the previous consumer", () => {
    const first: any[] = [];
    const second: any[] = [];
    attachIceConsumer("swap", (c) => first.push(c));
    attachIceConsumer("swap", (c) => second.push(c));
    stashIceCandidate("swap", { candidate: "to-second" } as any);
    expect(first).toHaveLength(0);
    expect(second).toHaveLength(1);
    detachIceConsumer("swap");
  });
});
