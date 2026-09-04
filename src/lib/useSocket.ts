"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useSession } from "@/lib/appwrite-session";
let socket: Socket | null = null;

async function getSocket(): Promise<Socket> {
  if (!socket) {
    // Fetch the JWT token from NextAuth session
    const res = await fetch("/api/auth/session");
    const session = await res.json();
    const token = session?.user ? btoa(JSON.stringify(session.user)) : "";

    socket = io(window.location.origin, {
      path: "/api/socketio",
      transports: ["websocket", "polling"],
      auth: {
        token: token,
      },
    });
  }
  return socket;
}

export function useSocket(userId?: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!userId) return;

    let mounted = true;

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
  }, [userId]);

  const on = useCallback((event: string, callback: (...args: any[]) => void) => {
    if (!socket) return () => {};
    socket.on(event, callback);
    return () => {
      socket?.off(event, callback);
    };
  }, []);

  const emit = useCallback((event: string, data?: any) => {
    if (socket) {
      socket.emit(event, data);
    }
  }, []);

  return { socket: socketRef.current, isConnected, onlineUsers, on, emit };
}

export function useSocketEvent(event: string, callback: (...args: any[]) => void, deps: any[] = []) {
  useEffect(() => {
    if (!socket) return;
    socket.on(event, callback);
    return () => {
      socket?.off(event, callback);
    };
  }, deps);
}
