"use client";

import { useCallback, useEffect, useState } from "react";
import { useSocketEvent } from "@/lib/hooks/useSocket";

// Module-level so the mount effect and the read-receipt refresh share one
// request path, and so no effect body calls setState directly.
async function fetchUnreadTotal(): Promise<number | null> {
  try {
    const res = await fetch("/api/groups/unread");
    const data = await res.json();
    return typeof data?.unread === "number" ? data.unread : null;
  } catch (error) {
    console.error("Unread groups fetch failed:", error);
    return null;
  }
}

/**
 * Single owner of the unread GROUP message count (the Groups badge, desktop +
 * mobile). Same contract as useUnreadMessages does for DMs:
 * - fresh total on mount from /api/groups/unread
 * - polling/SSE mode: absolute counts published by the realtime loop when they
 *   change ("groups-unread")
 * - WebSocket mode: per-event increments ("new-group-message")
 *
 * Takes the viewer's id because, unlike a DM (which only ever arrives from
 * someone else), a group message event fires for my own sends too — the sender
 * is a member of the group they just posted in.
 */
export function useUnreadGroups(userId?: string): number {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    (async () => {
      const total = await fetchUnreadTotal();
      if (alive && total !== null) setUnread(total);
    })();
    return () => {
      alive = false;
    };
  }, [userId]);

  const refresh = useCallback(async () => {
    const total = await fetchUnreadTotal();
    if (total !== null) setUnread(total);
  }, []);

  useSocketEvent("groups-unread", (count: number) => setUnread(count), []);
  useSocketEvent(
    "new-group-message",
    (msg: any) => {
      if (!msg?.senderId || msg.senderId === userId) return;
      setUnread((prev) => prev + 1);
    },
    [userId]
  );
  // Opening a group clear-reads it server-side. Re-ask for the total instead of
  // guessing how many were in there, which also covers WebSocket deployments —
  // there is no read receipt broadcast to subtract from.
  useSocketEvent("groups-read", () => void refresh(), [refresh]);

  return unread;
}
