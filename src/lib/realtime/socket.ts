// WebSocket transport (server.ts deployments) and the policy for when to give
// up on it. On the first connection failure wsBroken latches and the socket is
// discarded, so every later mount goes straight to polling instead of waiting
// on a socket that will never speak again.

import { io, Socket } from "socket.io-client";
import { publish } from "./bus";

let socket: Socket | null = null;
let wsBroken = false;

function isVercelDeployment(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.location.hostname.includes("vercel.app") ||
    window.location.hostname.includes("vercel.io") ||
    process.env.NEXT_PUBLIC_VERCEL === "1"
  );
}

/** True while a WebSocket is still worth attempting. */
export function canTryWebSocket(): boolean {
  return !wsBroken && !isVercelDeployment();
}

export function getSocket(): Socket {
  if (!socket) {
    socket = io(window.location.origin, {
      path: "/api/socketio",
      transports: ["websocket", "polling"],
      timeout: 3000,
    });
    socket.onAny((event: string, ...args: any[]) => publish(event, args[0]));
  }
  return socket;
}

/** The socket only exists while healthy — null means "use the REST path". */
export function currentSocket(): Socket | null {
  return socket;
}

/** Latch the failure for this session. Returns true only for the first latch. */
export function markSocketBroken(failed: Socket): boolean {
  const first = !wsBroken;
  wsBroken = true;
  if (first) {
    failed.disconnect();
    socket = null;
  }
  return first;
}
