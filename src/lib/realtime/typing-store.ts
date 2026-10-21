// In-memory typing state (ephemeral, per-instance — fine for typing hints).
// Supports both DM (keyed by receiver userId) and group chat (keyed by groupId).
type TypingEntry = { senderId: string; senderName: string; timestamp: number };

// DM: receiverId → senderId → entry
const dmTyping = new Map<string, Map<string, TypingEntry>>();
// Group: groupId → senderId → entry
const groupTyping = new Map<string, Map<string, TypingEntry>>();

// Entries older than this are dropped at read time — a typist who closes
// their tab never sends stop-typing, so freshness comes from keystroke pings
// (clients re-ping every ~2s while typing).
const TYPING_FRESH_MS = 8000;

function getMap(store: Map<string, Map<string, TypingEntry>>, key: string) {
  const senders = store.get(key) ?? new Map<string, TypingEntry>();
  store.set(key, senders);
  return senders;
}

export function setDmTyping(receiverId: string, senderId: string, senderName: string): void {
  const senders = getMap(dmTyping, receiverId);
  senders.set(senderId, { senderId, senderName: senderName || "User", timestamp: Date.now() });
}

export function clearDmTyping(receiverId: string, senderId: string): void {
  const senders = dmTyping.get(receiverId);
  if (!senders) return;
  senders.delete(senderId);
  if (senders.size === 0) dmTyping.delete(receiverId);
}

export function freshDmTypingFor(receiverId: string): TypingEntry[] {
  const cutoff = Date.now() - TYPING_FRESH_MS;
  const senders = dmTyping.get(receiverId);
  if (!senders) return [];
  return Array.from(senders.values()).filter((t) => t.timestamp >= cutoff);
}

export function setGroupTyping(groupId: string, senderId: string, senderName: string): void {
  const senders = getMap(groupTyping, groupId);
  senders.set(senderId, { senderId, senderName: senderName || "User", timestamp: Date.now() });
}

export function clearGroupTyping(groupId: string, senderId: string): void {
  const senders = groupTyping.get(groupId);
  if (!senders) return;
  senders.delete(senderId);
  if (senders.size === 0) groupTyping.delete(groupId);
}

export function freshGroupTypingFor(groupId: string): TypingEntry[] {
  const cutoff = Date.now() - TYPING_FRESH_MS;
  const senders = groupTyping.get(groupId);
  if (!senders) return [];
  return Array.from(senders.values()).filter((t) => t.timestamp >= cutoff);
}

// Legacy exports for backward compatibility with DM code
export const setTyping = setDmTyping;
export const clearTyping = clearDmTyping;
export const freshTypingFor = freshDmTypingFor;

// Purge stale entries so the map can't grow unbounded on instances nobody
// reads from.
function purgeStore(store: Map<string, Map<string, TypingEntry>>, cutoff: number) {
  Array.from(store.entries()).forEach(([key, senders]) => {
    Array.from(senders.entries()).forEach(([senderId, t]) => {
      if (t.timestamp < cutoff) senders.delete(senderId);
    });
    if (senders.size === 0) store.delete(key);
  });
}

setInterval(() => {
  const cutoff = Date.now() - TYPING_FRESH_MS;
  purgeStore(dmTyping, cutoff);
  purgeStore(groupTyping, cutoff);
}, 60 * 1000);
