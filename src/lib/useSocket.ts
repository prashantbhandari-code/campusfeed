"use client";

import { useEffect, useState, useCallback } from "react";
import { subscribe } from "./realtime/bus";
import { startRealtime, stopRealtime } from "./realtime";
import { canTryWebSocket, currentSocket, getSocket, markSocketBroken } from "./realtime/socket";

export function useSocket(userId?: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

  useEffect(() => {
    if (!userId) return;

    let mounted = true;
    let fallbackEngaged = false;
    const engageFallback = () => {
      if (!fallbackEngaged) {
        fallbackEngaged = true;
        startRealtime(); // SSE where supported, JSON polling otherwise
      }
      if (mounted) setIsConnected(true);
    };

    // No WebSocket ahead (Vercel, or one already proven broken) — SSE/poll now.
    if (!canTryWebSocket()) {
      engageFallback();
      return () => {
        if (fallbackEngaged) stopRealtime();
      };
    }

    const s = getSocket();

    const onConnect = () => {
      if (!mounted) return;
      setIsConnected(true);
      s.emit("join", userId);
    };
    const onUsers = (userIds: string[]) => mounted && setOnlineUsers(userIds);
    const onFail = () => {
      const firstFailure = markSocketBroken(s); // latch regardless of lifecycle
      if (mounted) {
        if (firstFailure) console.log("🔌 WebSocket unavailable — falling back to SSE mode");
        engageFallback();
      }
    };

    s.on("connect", onConnect);
    s.on("users-online", onUsers);
    s.once("connect_error", onFail);
    if (s.connected) onConnect();

    return () => {
      mounted = false;
      s.off("connect", onConnect);
      s.off("users-online", onUsers);
      s.off("connect_error", onFail);
      if (fallbackEngaged) stopRealtime();
    };
  }, [userId]);

  const emit = useCallback((event: string, data?: any) => {
    const s = currentSocket();
    if (s) {
      s.emit(event, data); // buffers while connecting, flushes on connect
      return;
    }
    fetch("/api/socketio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: event, ...data }),
    }).catch((err) => console.error("Emit error:", err));
  }, []);

  return { isConnected, onlineUsers, emit };
}

export function useSocketEvent(
  event: string,
  callback: (...args: any[]) => void,
  deps: any[] = []
) {
  useEffect(() => subscribe(event, callback), deps);
}
