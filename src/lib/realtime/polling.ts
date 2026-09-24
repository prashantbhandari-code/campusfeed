// HTTP polling transport: a ref-counted 2s loop shared by every hook instance.
// Works on any host — reads new messages/reactions from the DB and typing
// state from the server's in-memory store via /api/socketio.

import { publish } from "./bus";

const POLL_MS = 2000;

let refs = 0;
let timer: ReturnType<typeof setInterval> | null = null;
let since = 0; // server timestamps; lags real time by a skew window (dedup absorbs re-sends)
let inFlight = false; // never stack ticks — each one holds 5 DB connections
let lastUnreadNotifs: number | null = null;
let lastUnreadMsgs: number | null = null;
const seenSignals = new Set<string>(); // call signals re-scan the skew window — drop repeats by id
let typingFromSet = new Set<string>(); // everyone seen typing in the previous tick

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

async function pollOnce(): Promise<void> {
  if (inFlight) return; // previous tick still running; skip rather than pile up
  inFlight = true;
  // Abort a stalled tick before Vercel's 10s kill so inFlight releases and
  // the next tick retries fresh — one hung fetch must not stop delivery.
  const ctrl = new AbortController();
  const watchdog = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(`/api/socketio?since=${since}&type=messages`, { signal: ctrl.signal });
    if (res.ok) {
      const data = await res.json();
      if (typeof data.timestamp === "number") since = data.timestamp;
      (data.messages || []).forEach((m: any) => publish("new-message", m.message));
      // Changed rows = edits, unsend tombstones, reaction-driven bumps, and my
      // own sends echoed from another device (those never appear in the
      // receiver-only new-rows scan). Dispatch on content shape; publishing
      // both events is safe — every handler dedupes/merges by message id.
      (data.changedMessages || []).forEach((m: any) => {
        if (m.deletedForEveryone) {
          publish("message-deleted", { messageId: m.id });
        } else {
          publish("new-message", m);
          publish("message-edited", { messageId: m.id, content: m.content, editedAt: m.editedAt });
          if (Array.isArray(m.reactions)) {
            publish("message-reaction", { messageId: m.id, reactions: m.reactions });
          }
        }
      });
      // Group rows carry their full shape — tombstones included (soft delete).
      (data.groupMessages || []).forEach((m: any) => publish("new-group-message", m));
      (data.changedGroupMessages || []).forEach((m: any) => {
        if (m.deletedForEveryone) {
          publish("group-message-deleted", { messageId: m.id, groupId: m.groupId });
        } else {
          publish("new-group-message", m);
        }
      });
      (data.reactions || []).forEach((r: any) => publish("message-reaction", r));
      for (const s of data.callSignals || []) {
        if (seenSignals.has(s.id)) continue;
        seenSignals.add(s.id);
        if (seenSignals.size > 500) {
          // Set iterates in insertion order — prune the oldest quarter
          const oldest: string[] = [];
          seenSignals.forEach((id) => { if (oldest.length < 250) oldest.push(id); });
          oldest.forEach((id) => seenSignals.delete(id));
        }
        publish(s.event, s.data);
      }
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
      // The server sends everyone currently typing to this user (fresh entries
      // only — stale ones are pruned server-side); diff against the previous
      // tick so listeners can show/hide who is typing.
      const typingList: Array<{ senderId: string; senderName?: string }> = data.typing || [];
      const freshSet = new Set(typingList.map((t) => t.senderId));
      for (const t of typingList) {
        if (!typingFromSet.has(t.senderId)) publish("user-typing", t);
      }
      typingFromSet.forEach((gone: string) => {
        if (!freshSet.has(gone)) publish("user-stop-typing", { senderId: gone });
      });
      typingFromSet = freshSet;
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

export function startPolling(): void {
  refs++;
  if (!timer) {
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
    typingFromSet = new Set();
    disarmWake?.();
    disarmWake = null;
  }
}
