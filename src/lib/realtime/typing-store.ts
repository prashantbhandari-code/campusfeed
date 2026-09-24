// In-memory typing state (ephemeral, per-instance — fine for typing hints).
// Keyed receiverId → senderId → entry so several people can type to the same
// user at once without overwriting each other.
type TypingEntry = { senderId: string; senderName: string; timestamp: number };

const typingUsers = new Map<string, Map<string, TypingEntry>>();

// Entries older than this are dropped at read time — a typist who closes
// their tab never sends stop-typing, so freshness comes from keystroke pings
// (clients re-ping every ~2s while typing).
const TYPING_FRESH_MS = 8000;

export function setTyping(receiverId: string, senderId: string, senderName: string): void {
  const senders = typingUsers.get(receiverId) ?? new Map<string, TypingEntry>();
  senders.set(senderId, { senderId, senderName: senderName || "User", timestamp: Date.now() });
  typingUsers.set(receiverId, senders);
}

export function clearTyping(receiverId: string, senderId: string): void {
  const senders = typingUsers.get(receiverId);
  if (!senders) return;
  senders.delete(senderId);
  if (senders.size === 0) typingUsers.delete(receiverId);
}

export function freshTypingFor(receiverId: string): TypingEntry[] {
  const cutoff = Date.now() - TYPING_FRESH_MS;
  const senders = typingUsers.get(receiverId);
  if (!senders) return [];
  return Array.from(senders.values()).filter((t) => t.timestamp >= cutoff);
}

// Purge stale entries so the map can't grow unbounded on instances nobody
// reads from.
setInterval(() => {
  const cutoff = Date.now() - TYPING_FRESH_MS;
  Array.from(typingUsers.entries()).forEach(([receiverId, senders]) => {
    Array.from(senders.entries()).forEach(([senderId, t]) => {
      if (t.timestamp < cutoff) senders.delete(senderId);
    });
    if (senders.size === 0) typingUsers.delete(receiverId);
  });
}, 60 * 1000);
