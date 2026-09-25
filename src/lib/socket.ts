import { Server as SocketIOServer } from "socket.io";

// WebSocket-mode (self-host `server.ts`) emit helpers.
//
// On Vercel this module's `io` stays null forever — setIO() only runs inside
// server.ts — so emitToUser/emitToGroup are deliberate no-ops there. That is
// safe: the Vercel deployment delivers the same events through the SSE
// transport (collect-delta → /api/realtime). These helpers exist for the
// self-host path only, where server.ts registers the Socket.IO server here
// and API routes emit into it directly.
let io: SocketIOServer | null = null;

export function setIO(server: SocketIOServer) {
  io = server;
}

// Emit to a specific user's room (self-host WS mode; no-op on Vercel —
// SSE delivers the same event).
export function emitToUser(userId: string, event: string, data: any) {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, data);
}

// Emit to a group chat room (self-host WS mode; callers must join rooms
// server-side). No-op on Vercel — SSE delivers the same event.
export function emitToGroup(groupId: string, event: string, data: any) {
  if (!io) return;
  io.to(`group:${groupId}`).emit(event, data);
}
