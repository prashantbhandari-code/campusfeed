"use client";

import { useEffect, useState } from "react";
import { useSocketEvent } from "@/lib/useSocket";

/**
 * Single owner of the unread DM count (the Messages badge, desktop + mobile).
 * Fresh total on mount from /api/messages, then:
 * - polling mode (Vercel / no socket server): absolute counts published by
 *   the realtime loop when they change ("messages-unread")
 * - WebSocket mode: per-event increments ("new-message")
 */
export function useUnreadMessages(): number {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/messages");
        const data = await res.json();
        if (Array.isArray(data)) {
          setUnread(data.reduce((acc: number, c: any) => acc + (c.unread || 0), 0));
        }
      } catch (error) {
        console.error("Unread messages fetch failed:", error);
      }
    })();
  }, []);

  useSocketEvent("messages-unread", (count: number) => setUnread(count), []);
  useSocketEvent("new-message", () => setUnread((prev) => prev + 1), []);

  return unread;
}
