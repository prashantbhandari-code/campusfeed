// Fallback realtime transport: a ref-counted 2s JSON poll of /api/socketio,
// used only where EventSource is unavailable. Emits the same bus events as
// the SSE transport via the shared dispatcher.

import { dispatchDelta, resetDeltaState, trackSignal } from "./frames";
import { publish } from "./bus";

const POLL_MS = 2000;

let refs = 0;
let timer: ReturnType<typeof setInterval> | null = null;
let since = 0; // server timestamps; lags real time by a skew window (dedup absorbs re-sends)
let inFlight = false; // never stack ticks — each one holds several DB connections
let currentGroupId: string | null = null; // track current group for typing

// Mobile browsers freeze timers in background tabs, so the loop stalls there.
// When the tab wakes (or the network switches), force a catch-up poll
// immediately instead of waiting up to 2s for the next tick.
function armWakeListeners() {
  if (typeof window === "undefined") return () => {};
  const wake = () => {
    if (refs > 0) pollOnce();
  };
  window.addEventListener("focus", wake);
  document.addEventListener("visibilitychange", wake);
  window.addEventListener("online", wake);
  return () => {
    window.removeEventListener("focus", wake);
    document.removeEventListener("visibilitychange", wake);
    window.removeEventListener("online", wake);
  };
}

let disarmWake: (() => void) | null = null;

function buildPollUrl(): string {
  const params = new URLSearchParams();
  params.set('since', String(since));
  params.set('type', 'messages');
  if (currentGroupId) params.set('groupId', currentGroupId);
  return `/api/socketio?${params.toString()}`;
}

async function pollOnce(): Promise<void> {
  if (inFlight) return; // previous tick still running; skip rather than pile up
  inFlight = true;
  // Abort a stalled tick before Vercel's 10s kill so inFlight releases and
  // the next tick retries fresh — one hung fetch must not stop delivery.
  const ctrl = new AbortController();
  const watchdog = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(buildPollUrl(), { signal: ctrl.signal });
    if (res.ok) {
      const data = await res.json();
      if (typeof data.nextSince === "number") since = data.nextSince;
      dispatchDelta(data);
      for (const s of data.callSignals || []) {
        if (trackSignal(s.id)) publish(s.event, s.data);
      }
    }
  } catch (error) {
    if (!(error instanceof DOMException && error.name === "AbortError")) {
      console.error("Polling error:", error);
    }
  } finally {
    clearTimeout(watchdog);
    inFlight = false;
  }
}

export function startPolling(groupId?: string): void {
  if (groupId) currentGroupId = groupId;
  refs++;
  if (!timer) {
    resetDeltaState();
    pollOnce(); // immediate first tick
    timer = setInterval(pollOnce, POLL_MS);
    disarmWake = armWakeListeners();
  }
}

export function stopPolling(): void {
  refs = Math.max(0, refs - 1);
  if (refs === 0 && timer) {
    clearInterval(timer);
    timer = null;
    disarmWake?.();
    disarmWake = null;
    currentGroupId = null;
  }
}
