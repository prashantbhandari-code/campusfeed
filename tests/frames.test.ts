import { describe, it, expect, beforeEach, vi } from "vitest";
import { dispatchDelta, resetDeltaState, trackSignal } from "@/lib/realtime/frames";
import { subscribe } from "@/lib/realtime/bus";

// frames.ts publishes onto the window bus — provide a minimal DOM shim since
// the test environment is node.
beforeEach(() => {
  if (typeof (globalThis as any).window === "undefined") {
    (globalThis as any).window = {
      dispatchEvent: (e: Event) => true,
      addEventListener: (_t: string, _l: EventListener) => {},
      removeEventListener: (_t: string, _l: EventListener) => {},
    };
  }
  resetDeltaState();
});

function capture(): { events: Array<{ event: string; data: any }>; off: () => void } {
  const events: Array<{ event: string; data: any }> = [];
  const off = subscribe("*" as any, () => {}); // bus has no wildcard; we shim below
  // Simpler: monkey-patch dispatchEvent to record CustomEvents
  const orig = (globalThis as any).window.dispatchEvent;
  (globalThis as any).window.dispatchEvent = (e: any) => {
    events.push({ event: e.detail?.event, data: e.detail?.data });
    return true;
  };
  return {
    events,
    off: () => {
      (globalThis as any).window.dispatchEvent = orig;
    },
  };
}

describe("dispatchDelta", () => {
  it("publishes new-message for each incoming message row", () => {
    const { events, off } = capture();
    dispatchDelta({ messages: [{ message: { id: "m1", content: "hi" } }] });
    expect(events.filter((e) => e.event === "new-message")).toHaveLength(1);
    off();
  });

  it("publishes message-deleted (not new-message) for tombstones", () => {
    const { events, off } = capture();
    dispatchDelta({ changedMessages: [{ id: "m2", deletedForEveryone: true }] });
    expect(events.some((e) => e.event === "message-deleted")).toBe(true);
    expect(events.some((e) => e.event === "new-message")).toBe(false);
    off();
  });

  it("publishes edited + reaction events for changed rows with reactions", () => {
    const { events, off } = capture();
    dispatchDelta({
      changedMessages: [{ id: "m3", content: "edited", reactions: [{ emoji: "👍" }] }],
    });
    expect(events.some((e) => e.event === "message-edited")).toBe(true);
    expect(events.some((e) => e.event === "message-reaction")).toBe(true);
    off();
  });

  it("emits group tombstones as group-message-deleted with groupId", () => {
    const { events, off } = capture();
    dispatchDelta({ changedGroupMessages: [{ id: "g1", deletedForEveryone: true, groupId: "grp" }] });
    const evt = events.find((e) => e.event === "group-message-deleted");
    expect(evt?.data).toEqual({ messageId: "g1", groupId: "grp" });
    off();
  });

  it("diffs typing state into user-typing / user-stop-typing pairs", () => {
    const { events, off } = capture();
    dispatchDelta({ typing: [{ senderId: "u1" }, { senderId: "u2" }] });
    dispatchDelta({ typing: [{ senderId: "u2" }] });
    dispatchDelta({ typing: [] });
    const names = events.map((e) => e.event);
    expect(names).toEqual(["user-typing", "user-typing", "user-stop-typing", "user-stop-typing"]);
    off();
  });

  it("publishes unread counters only when they change", () => {
    const { events, off } = capture();
    dispatchDelta({ unreadMessages: 3 });
    dispatchDelta({ unreadMessages: 3 });
    dispatchDelta({ unreadMessages: 4 });
    const badgeEvents = events.filter((e) => e.event === "messages-unread");
    expect(badgeEvents.map((e) => e.data)).toEqual([3, 4]);
    off();
  });
});

describe("trackSignal", () => {
  it("admits a signal id exactly once (dedupe across reconnects)", () => {
    expect(trackSignal("sig-1")).toBe(true);
    expect(trackSignal("sig-1")).toBe(false);
    expect(trackSignal("sig-2")).toBe(true);
  });

  it("prunes old ids when the set grows past 500", () => {
    for (let i = 0; i < 600; i++) trackSignal(`bulk-${i}`);
    // The earliest ids should have been evicted, so sig-1 from before is gone
    expect(trackSignal("sig-1")).toBe(true);
  });
});
