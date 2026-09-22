"use client";

import { useEffect, useState } from "react";
import { useSocketEvent } from "@/lib/useSocket";

/**
 * Single owner of the unread notification count. Fresh value on mount, then:
 * - polling mode (Vercel / no socket server): absolute counts published by
 *   the realtime loop when they change ("notification-unread")
 * - WebSocket mode: per-event increments ("new-notification")
 */
export function useUnreadNotifications(): number {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/notifications");
        const data = await res.json();
        if (Array.isArray(data)) setUnread(data.filter((n: any) => !n.read).length);
      } catch (error) {
        console.error("Unread notifications fetch failed:", error);
      }
    })();
  }, []);

  useSocketEvent("notification-unread", (count: number) => setUnread(count), []);
  useSocketEvent("new-notification", () => setUnread((prev) => prev + 1), []);

  return unread;
}
