"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useSession } from "@/lib/appwrite-session";

let socket: Socket | null = null;

// ---- Polling fallback (shared, ref-counted so all hooks share one interval) ----
let pollingActive = false;
let pollRefs = 0;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let lastTimestamp = 0;
let lastTyping: { senderId: string } | null = null;

function isVercelDeployment(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.location.hostname.includes("vercel.app") ||
    window.location.hostname.includes("vercel.io") ||
    process.env.NEXT_PUBLIC_VERCEL === "1"
  );
}

function dispatch(event: string, data?: any) {
  window.dispatchEvent(new CustomEvent("socket-message", { detail: { event, data } }));
}

async function pollOnce(): Promise<void> {
  try {
    const res = await fetch(`/api/socketio?since=${lastTimestamp}&type=messages`);
    if (res.ok) {
      const data = await res.json();
      if (typeof data.timestamp === "number") lastTimestamp = data.timestamp;
      (data.messages || []).forEach((m: any) => dispatch("new-message", m.message));
      (data.reactions || []).forEach((r: any) => dispatch("message-reaction", r));
    }

    const typingRes = await fetch(`/api/socketio?since=${lastTimestamp}&type=typing`);
    if (typingRes.ok) {
      const typing = (await typingRes.json()).typing;
      if (typing) {
        lastTyping = typing;
        dispatch("user-typing", typing);
      } else if (lastTyping) {
        dispatch("user-stop-typing", { senderId: lastTyping.senderId });
        lastTyping = null;
      }
    }
  } catch (error) {
    console.error("Polling error:", error);
  }
}

function retainPolling() {
  pollRefs++;
  pollingActive = true;
  if (!pollTimer) {
    pollOnce(); // immediate first tick
    pollTimer = setInterval(pollOnce, 2000);
  }
}

function releasePolling() {
  pollRefs = Math.max(0, pollRefs - 1);
  if (pollRefs === 0 && pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
    pollingActive = false;
    lastTyping = null;
  }
}

/**
 * Get or create WebSocket connection (server.ts deployments).
 * A single onAny hook forwards every event through the same window
 * CustomEvent bus the polling mode uses — one path for all consumers.
 */
function getSocket(): Socket {
  if (!socket) {
    socket = io(window.location.origin, {
      path: "/api/socketio",
      transports: ["websocket", "polling"],
      timeout: 3000,
    });
    socket.onAny((event: string, ...args: any[]) => {
      if (pollingActive) return; // fallback engaged; socket disconnected anyway
      dispatch(event, args[0]);
    });
  }
  return socket;
}

export function useSocket(userId?: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

  useEffect(() => {
    if (!userId) return;

    let mounted = true;
    let retained = false;
    const engagePolling = () => {
      if (!retained) {
        retained = true;
        retainPolling();
      }
      if (mounted) setIsConnected(true);
    };

    // Vercel: no WebSocket support at all — poll from the start.
    if (isVercelDeployment()) {
      engagePolling();
      return () => {
        if (retained) releasePolling();
      };
    }

    // Otherwise try WebSocket (server.ts); fall back to polling if it fails
    // (e.g. `next dev` / `next start` have no Socket.IO server).
    const s = getSocket();

    const onConnect = () => {
      if (!mounted) return;
      setIsConnected(true);
      s.emit("join", userId);
    };
    const onUsers = (userIds: string[]) => mounted && setOnlineUsers(userIds);
    const onFail = () => {
      if (pollingActive) return;
      console.log("🔌 WebSocket unavailable — falling back to polling mode");
      s.disconnect(); // stop retry spam; polling owns delivery now
      engagePolling();
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
      if (retained) releasePolling();
    };
  }, [userId]);

  const on = useCallback((event: string, callback: (...args: any[]) => void) => {
    const handler = (e: CustomEvent) => {
      if (e.detail.event === event) callback(e.detail.data);
    };
    window.addEventListener("socket-message", handler as EventListener);
    return () => window.removeEventListener("socket-message", handler as EventListener);
  }, []);

  const emit = useCallback((event: string, data?: any) => {
    if (pollingActive || !socket) {
      fetch("/api/socketio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: event, ...data }),
      }).catch((err) => console.error("Emit error:", err));
    } else {
      socket.emit(event, data); // buffers while connecting, flushes on connect
    }
  }, []);

  return { socket, isConnected, onlineUsers, on, emit };
}

export function useSocketEvent(
  event: string,
  callback: (...args: any[]) => void,
  deps: any[] = []
) {
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      if (e.detail.event === event) callback(e.detail.data);
    };
    window.addEventListener("socket-message", handler as EventListener);
    return () => window.removeEventListener("socket-message", handler as EventListener);
  }, deps);
}
