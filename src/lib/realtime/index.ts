// Transport selection: SSE where the browser supports EventSource, JSON
// polling as the fallback. Both speak the same delta shape and publish the
// same bus events, so callers can't tell the difference.

import { startSSE, stopSSE } from "./sse";
import { startPolling, stopPolling } from "./polling";

export function canUseSSE(): boolean {
  return typeof window !== "undefined" && typeof EventSource !== "undefined";
}

export function startRealtime(): void {
  if (canUseSSE()) startSSE();
  else startPolling();
}

export function stopRealtime(): void {
  if (canUseSSE()) stopSSE();
  else stopPolling();
}
