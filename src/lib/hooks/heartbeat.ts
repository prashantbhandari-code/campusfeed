"use client";

import { useEffect, useRef } from "react";
import { useSession } from "@/lib/auth/session";

const HEARTBEAT_INTERVAL_MS = 30_000; // 30 seconds
const ACTIVITY_THRESHOLD_MS = 60_000; // consider active if any activity within 60s

// Track user activity to avoid sending heartbeats when tab is background
let lastActivity = Date.now();
let activityListenersAdded = false;

function trackActivity() {
  lastActivity = Date.now();
}

export function useHeartbeat(): void {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!userId) return;

    // Add global activity listeners once
    if (!activityListenersAdded && typeof window !== "undefined") {
      ["mousemove", "keydown", "click", "scroll", "touchstart"].forEach((evt) =>
        window.addEventListener(evt, trackActivity, { passive: true })
      );
      activityListenersAdded = true;
    }

    const sendHeartbeat = async () => {
      // Only send if user was active recently
      if (Date.now() - lastActivity > ACTIVITY_THRESHOLD_MS) return;

      try {
        await fetch("/api/heartbeat", { method: "POST" });
      } catch {
        // Silent fail — heartbeat is best-effort
      }
    };

    // Send initial heartbeat
    sendHeartbeat();

    // Set up interval
    intervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);

    // Also send on visibility change (tab becomes visible)
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") sendHeartbeat();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [userId]);
}

// Helper to get user-friendly "last seen" string
export function formatLastSeen(lastSeen: Date | string | null): string {
  if (!lastSeen) return "never";

  const diff = Math.floor((Date.now() - new Date(lastSeen).getTime()) / 1000);

  // "Active now" if within 30 seconds
  if (diff < 30) return "Active now";

  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;

  const date = new Date(lastSeen);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}