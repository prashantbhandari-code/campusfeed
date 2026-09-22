import { Server as SocketIOServer } from "socket.io";

let io: SocketIOServer | null = null;

export function getIO(): SocketIOServer | null {
  return io;
}

export function setIO(server: SocketIOServer) {
  io = server;
}

// Helper: emit to a specific user by their userId
export function emitToUser(userId: string, event: string, data: any) {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, data);
}

// Helper: emit to a group chat room (callers must join rooms server-side)
export function emitToGroup(groupId: string, event: string, data: any) {
  if (!io) return;
  io.to(`group:${groupId}`).emit(event, data);
}

// Helper: broadcast to all connected users
export function broadcast(event: string, data: any) {
  if (!io) return;
  io.emit(event, data);
}
