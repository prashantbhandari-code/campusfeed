"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

function getSocket(): Socket {
  if (!socket) {
    socket = io(window.location.origin, {
      path: "/api/socketio",
      transports: ["websocket", "polling"],
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

    const s = getSocket();
    socketRef.current = s;

    s.on("connect", () => {
      setIsConnected(true);
      s.emit("join", userId);
      s.emit("register", userId);
    });

    s.on("disconnect", () => {
      setIsConnected(false);
    });

    // Listen for online users list
    s.on("users-online", (userIds: string[]) => {
      setOnlineUsers(userIds);
    });

    // If already connected, join room
    if (s.connected) {
      setIsConnected(true);
      s.emit("join", userId);
      s.emit("register", userId);
    }

    return () => {
      // Don't disconnect on component unmount — keep the singleton alive
    };
  }, [userId]);

  const on = useCallback((event: string, callback: (...args: any[]) => void) => {
    const s = getSocket();
    s.on(event, callback);
    return () => {
      s.off(event, callback);
    };
  }, []);

  const emit = useCallback((event: string, data?: any) => {
    const s = getSocket();
    s.emit(event, data);
  }, []);

  return { socket: socketRef.current, isConnected, onlineUsers, on, emit };
}

export function useSocketEvent(event: string, callback: (...args: any[]) => void, deps: any[] = []) {
  useEffect(() => {
    const s = getSocket();
    s.on(event, callback);
    return () => {
      s.off(event, callback);
    };
  }, deps);
}
