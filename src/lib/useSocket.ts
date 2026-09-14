"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useSession } from "@/lib/appwrite-session";

let socket: Socket | null = null;
let pollingActive = false;
let lastTimestamp = Date.now();

/**
 * Check if running on Vercel (no WebSocket support)
 */
function isVercelDeployment(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.location.hostname.includes("vercel.app") ||
    window.location.hostname.includes("vercel.io") ||
    process.env.NEXT_PUBLIC_VERCEL === "1"
  );
}

/**
 * Get or create WebSocket connection (for Render/custom servers)
 */
async function getSocket(): Promise<Socket> {
  if (!socket) {
    socket = io(window.location.origin, {
      path: "/api/socketio",
      transports: ["websocket", "polling"],
    });
  }
  return socket;
}

/**
 * Polling-based message fetching (for Vercel)
 */
async function pollMessages(
  callback: (messages: any[]) => void
): Promise<void> {
  try {
    const response = await fetch(
      `/api/socketio?since=${lastTimestamp}&type=messages`
    );

    if (response.ok) {
      const data = await response.json();

      if (data.messages && data.messages.length > 0) {
        callback(data.messages);
        lastTimestamp = data.timestamp;
      }
    }
  } catch (error) {
    console.error("Polling error:", error);
  }
}

/**
 * Polling-based typing indicator check
 */
async function pollTyping(
  callback: (typing: any) => void
): Promise<void> {
  try {
    const response = await fetch(`/api/socketio?type=typing`);

    if (response.ok) {
      const data = await response.json();
      if (data.typing) {
        callback(data.typing);
      }
    }
  } catch (error) {
    console.error("Typing poll error:", error);
  }
}

export function useSocket(userId?: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!userId) return;

    let mounted = true;
    const usePolling = isVercelDeployment();

    if (usePolling) {
      // ===== POLLING MODE (Vercel) =====
      console.log("🔌 Using polling mode for Vercel deployment");

      pollingActive = true;
      setIsConnected(true); // Always "connected" in polling mode

      // Poll for messages every 2 seconds
      pollingRef.current = setInterval(async () => {
        if (!mounted || !pollingActive) return;

        await pollMessages((messages) => {
          // Emit messages to registered handlers
          messages.forEach((msg: any) => {
            // Trigger any registered "new-message" handlers
            const event = new CustomEvent("socket-message", {
              detail: { event: "new-message", data: msg.message },
            });
            window.dispatchEvent(event);
          });
        });

        await pollTyping((typing) => {
          const event = new CustomEvent("socket-message", {
            detail: { event: "user-typing", data: typing },
          });
          window.dispatchEvent(event);
        });
      }, 2000);

      return () => {
        mounted = false;
        pollingActive = false;
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
        }
      };
    } else {
      // ===== WEBSOCKET MODE (Render/Custom Server) =====
      console.log("🔌 Using WebSocket mode");

      const connectSocket = async () => {
        const s = await getSocket();
        if (!mounted) return;

        socketRef.current = s;

        s.on("connect", () => {
          if (mounted) setIsConnected(true);
          s.emit("join", userId);
        });

        s.on("disconnect", () => {
          if (mounted) setIsConnected(false);
        });

        s.on("users-online", (userIds: string[]) => {
          if (mounted) setOnlineUsers(userIds);
        });

        if (s.connected) {
          if (mounted) setIsConnected(true);
          s.emit("join", userId);
        }
      };

      connectSocket();

      return () => {
        mounted = false;
      };
    }
  }, [userId]);

  const on = useCallback((event: string, callback: (...args: any[]) => void) => {
    const usePolling = isVercelDeployment();

    if (usePolling) {
      // Use CustomEvent for polling mode
      const handler = (e: CustomEvent) => {
        if (e.detail.event === event) {
          callback(e.detail.data);
        }
      };
      window.addEventListener("socket-message", handler as EventListener);
      return () => {
        window.removeEventListener("socket-message", handler as EventListener);
      };
    } else {
      // Use Socket.IO for WebSocket mode
      if (!socket) return () => {};
      socket.on(event, callback);
      return () => {
        socket?.off(event, callback);
      };
    }
  }, []);

  const emit = useCallback((event: string, data?: any) => {
    const usePolling = isVercelDeployment();

    if (usePolling) {
      // Use fetch for polling mode
      fetch("/api/socketio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: event, ...data }),
      }).catch((err) => console.error("Emit error:", err));
    } else {
      // Use Socket.IO for WebSocket mode
      if (socket) {
        socket.emit(event, data);
      }
    }
  }, []);

  return { socket: socketRef.current, isConnected, onlineUsers, on, emit };
}

export function useSocketEvent(
  event: string,
  callback: (...args: any[]) => void,
  deps: any[] = []
) {
  useEffect(() => {
    const usePolling = isVercelDeployment();

    if (usePolling) {
      // Use CustomEvent for polling mode
      const handler = (e: CustomEvent) => {
        if (e.detail.event === event) {
          callback(e.detail.data);
        }
      };
      window.addEventListener("socket-message", handler as EventListener);
      return () => {
        window.removeEventListener("socket-message", handler as EventListener);
      };
    } else {
      // Use Socket.IO for WebSocket mode
      if (!socket) return;
      socket.on(event, callback);
      return () => {
        socket?.off(event, callback);
      };
    }
  }, deps);
}
