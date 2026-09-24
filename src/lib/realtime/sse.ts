// Primary realtime transport: a loop of short-lived Server-Sent Events
// streams. Each connection lives a few seconds, ends with a "bye" frame
// carrying the next cursor, and EventSource's native reconnect continues
// from there. Near-instant delivery at a fraction of the old 2s-poll's
// invocation count.

import { publish } from "./bus";
import { dispatchDelta, resetDeltaState, trackSignal } from "./frames";

let refs = 0;
let es: EventSource | null = null;
let since = 0; // cursor; advanced by each delta frame and the final bye
let stopped = true;

function connect() {
  if (stopped || es) return;
  es = new EventSource(`/api/realtime?since=${since}`);

  es.addEventListener("delta", (e) => {
    try {
      const data = JSON.parse((e as MessageEvent).data);
      if (typeof data.nextSince === "number") since = data.nextSince;
      dispatchDelta(data);
      (data.callSignals || []).forEach((s: any) => {
        if (trackSignal(s.id)) publish(s.event, s.data);
      });
    } catch (err) {
      console.error("SSE frame error:", err);
    }
  });

  es.addEventListener("typing", (e) => {
    // Quiet-tick frame carrying only typing state — dispatch through the
    // same differ so indicators behave identically to a full delta.
    try {
      dispatchDelta({ typing: JSON.parse((e as MessageEvent).data).typing });
    } catch { /* malformed frame — next tick corrects */ }
  });

  es.addEventListener("bye", (e) => {
    try {
      const data = JSON.parse((e as MessageEvent).data);
      if (typeof data.since === "number") since = data.since;
    } catch { /* keep current cursor */ }
    closeStream();
    // Reconnect immediately — server closed its side on purpose (budget).
    if (!stopped) setTimeout(connect, 50);
  });

  es.onerror = () => {
    // EventSource retries on its own with growing backoff; reconnect from
    // the last cursor. Recreate from scratch so we don't replay old URL.
    closeStream();
    if (!stopped) setTimeout(connect, 1500);
  };
}

function closeStream() {
  if (es) {
    es.close();
    es = null;
  }
}

export function startSSE(): void {
  refs++;
  if (!stopped) return;
  stopped = false;
  resetDeltaState();
  connect();
}

export function stopSSE(): void {
  refs = Math.max(0, refs - 1);
  if (refs === 0) {
    stopped = true;
    closeStream();
  }
}
