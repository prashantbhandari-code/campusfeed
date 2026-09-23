// HTTP polling transport: a ref-counted 2s loop shared by every hook instance.
// Works on any host — reads new messages/reactions from the DB and typing
// state from the server's in-memory store via /api/socketio.

import { publish } from "./bus";

const POLL_MS = 2000;

let refs = 0;
let timer: ReturnType<typeof setInterval> | null = null;
let since = 0; // server timestamps; lags real time by a skew window (dedup absorbs re-sends)
let inFlight = false; // never stack ticks — each one holds 5 DB connections
let typingFrom: string | null = null;
let lastUnreadNotifs: number | null = null;
let lastUnreadMsgs: number | null = null;

async function pollOnce(): Promise<void> {
  if (inFlight) return; // previous tick still running; skip rather than pile up
  inFlight = true;
  try {
    const res = await fetch(`/api/socketio?since=${since}&type=messages`);
    if (res.ok) {
      const data = await res.json();
      if (typeof data.timestamp === "number") since = data.timestamp;
      (data.messages || []).forEach((m: any) => publish("new-message", m.message));
      (data.reactions || []).forEach((r: any) => publish("message-reaction", r));
      (data.groupMessages || []).forEach((m: any) => publish("new-group-message", m));
      if (
        typeof data.unreadNotifications === "number" &&
        data.unreadNotifications !== lastUnreadNotifs
      ) {
        lastUnreadNotifs = data.unreadNotifications;
        publish("notification-unread", data.unreadNotifications);
      }
      if (
        typeof data.unreadMessages === "number" &&
        data.unreadMessages !== lastUnreadMsgs
      ) {
        lastUnreadMsgs = data.unreadMessages;
        publish("messages-unread", data.unreadMessages);
      }

      // Typing comes back on the same response — one round trip per tick.
      const typing = data.typing;
      if (typing) {
        typingFrom = typing.senderId;
        publish("user-typing", typing);
      } else if (typingFrom) {
        publish("user-stop-typing", { senderId: typingFrom });
        typingFrom = null;
      }
    }
  } catch (error) {
    console.error("Polling error:", error);
  } finally {
    inFlight = false;
  }
}

export function startPolling(): void {
  refs++;
  if (!timer) {
    pollOnce(); // immediate first tick
    timer = setInterval(pollOnce, POLL_MS);
  }
}

export function stopPolling(): void {
  refs = Math.max(0, refs - 1);
  if (refs === 0 && timer) {
    clearInterval(timer);
    timer = null;
    typingFrom = null;
  }
}
