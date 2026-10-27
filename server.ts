import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server as SocketIOServer, Socket } from "socket.io";
import { setIO } from "./src/lib/calls/socket";
import prisma from "./src/lib/db/prisma";
import { NextResponse } from "next/server";
import { getUserIdFromCookieHeader } from "./src/lib/auth/session-token";
import { addSignal, startFlush, stopFlush } from "./src/lib/calls/signal-batcher";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  const io = new SocketIOServer(httpServer, {
    path: "/api/socketio",
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  setIO(io);

  // Track online users: userId -> Set of socketIds
  const onlineUsers = new Map<string, Set<string>>();

  const broadcastOnlineUsers = () => {
    const userIds = Array.from(onlineUsers.keys());
    io.emit("users-online", userIds);
  };

  // Identity comes from the server-side signed cc_session cookie (same
  // verification the HTTP APIs use) — never from a client-supplied token.
  // The old path trusted auth.token = btoa(JSON.stringify(user)), which
  // let any client impersonate any user and join their private message room.
  io.use((socket: Socket, next) => {
    try {
      const userId = getUserIdFromCookieHeader(socket.handshake.headers.cookie || null);
      if (!userId) {
        return next(new Error("Authentication required"));
      }
      socket.data.userId = userId;
      // Fetch user name for typing indicators
      prisma.user.findUnique({ where: { id: userId }, select: { name: true } }).then((u) => {
        if (u) socket.data.userName = u.name;
      });
      return next();
    } catch (error) {
      next(new Error("Authentication failed"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const userId = socket.data.userId || "anonymous";
    console.log("🔌 Socket connected:", socket.id, "User:", userId);

    // User joins their personal room — only ever their own. userId is the
    // server-verified identity from the signed cc_session cookie.
    socket.on("join", (joinUserId: string) => {
      if (!joinUserId || joinUserId !== userId) {
        console.log(`⚠️ User ${userId} tried to join room ${joinUserId} — rejected`);
        return;
      }

      socket.join(`user:${joinUserId}`);

      // Track online status
      if (!onlineUsers.has(userId)) {
        onlineUsers.set(userId, new Set());
      }
      onlineUsers.get(userId)!.add(socket.id);
      broadcastOnlineUsers();
      console.log(`👤 User ${userId} online (${onlineUsers.get(userId)!.size} sockets)`);
    });

    // User joins a group chat room — membership is verified against the
    // database (same rule the group messages API enforces); a client can only
    // join rooms for groups it actually belongs to.
    socket.on("join-group", async (payload: string | { groupId?: string }) => {
      const groupId = typeof payload === "string" ? payload : payload?.groupId;
      if (!groupId) return;
      try {
        const membership = await prisma.groupMember.findUnique({
          where: { groupId_userId: { groupId, userId } },
        });
        if (!membership) {
          console.log(`⚠️ User ${userId} tried to join group ${groupId} — not a member, rejected`);
          return;
        }
        socket.join(`group:${groupId}`);
        console.log(`👥 Socket ${socket.id} joined group ${groupId}`);
      } catch (error) {
        console.error("join-group failed:", error);
      }
    });

    // User leaves a group chat room
    socket.on("leave-group", (payload: string | { groupId?: string }) => {
      const groupId = typeof payload === "string" ? payload : payload?.groupId;
      if (groupId) socket.leave(`group:${groupId}`);
    });

    // Typing indicators
    socket.on("typing", (data: { receiverId: string; senderName: string }) => {
      socket.to(`user:${data.receiverId}`).emit("user-typing", {
        senderId: userId,
        senderName: data.senderName,
      });
    });

    socket.on("stop-typing", (data: { receiverId: string }) => {
      socket.to(`user:${data.receiverId}`).emit("user-stop-typing", {
        senderId: userId,
      });
    });

    // Group chat typing indicators
    socket.on("group-typing", async (data: { groupId: string }) => {
      // Verify membership before relaying
      const membership = await prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId: data.groupId, userId } },
      });
      if (!membership) {
        console.log(`⚠️ User ${userId} tried to send typing to group ${data.groupId} — not a member, rejected`);
        return;
      }
      socket.to(`group:${data.groupId}`).emit("group-user-typing", {
        senderId: userId,
        senderName: socket.data.userName || "User",
      });
    });

    socket.on("group-stop-typing", (data: { groupId: string }) => {
      socket.to(`group:${data.groupId}`).emit("group-user-stop-typing", {
        senderId: userId,
      });
    });

    // ========== CALL SIGNALING ==========
    socket.on("call-offer", (data: { receiverId: string; offer: any; callerName: string; callerAvatar?: string; callType: "audio" | "video" }) => {
      console.log(`📞 Call offer from ${userId} to ${data.receiverId} (${data.callType})`);
      socket.to(`user:${data.receiverId}`).emit("incoming-call", {
        callerId: userId,
        callerName: data.callerName,
        callerAvatar: data.callerAvatar,
        offer: data.offer,
        callType: data.callType,
      });
    });

    socket.on("call-answer", (data: { callerId: string; answer: any }) => {
      console.log(`📞 Call answer from ${userId} to ${data.callerId}`);
      socket.to(`user:${data.callerId}`).emit("call-accepted", {
        answer: data.answer,
        receiverId: userId,
      });
    });

    socket.on("call-reject", (data: { callerId: string }) => {
      console.log(`📞 Call rejected by ${userId}`);
      socket.to(`user:${data.callerId}`).emit("call-rejected", {
        receiverId: userId,
      });
    });

    socket.on("call-end", (data: { otherUserId: string }) => {
      console.log(`📞 Call ended by ${userId}`);
      socket.to(`user:${data.otherUserId}`).emit("call-ended", {
        endedBy: userId,
      });
    });

    socket.on("ice-candidate", (data: { targetUserId: string; candidate: any }) => {
      socket.to(`user:${data.targetUserId}`).emit("ice-candidate", {
        candidate: data.candidate,
        fromUserId: userId,
      });

      // Batch ICE candidates for database persistence
      startFlush(data.targetUserId);
      addSignal(data.targetUserId, "ice-candidate", { candidate: data.candidate } as any, userId);
    });

    socket.on("disconnect", () => {
      if (userId && userId !== "anonymous") {
        const sockets = onlineUsers.get(userId);
        if (sockets) {
          sockets.delete(socket.id);
          if (sockets.size === 0) {
            onlineUsers.delete(userId);
          }
        }
        broadcastOnlineUsers();
        console.log(`👤 User ${userId} offline`);

        // Flush any pending signals for this user
        stopFlush(userId);
      } else {
        console.log("🔌 Socket disconnected:", socket.id);
      }
    });
  });

  httpServer.listen(port, () => {
    console.log(`> CampusConnect ready on http://${hostname}:${port}`);
    console.log(`> Socket.io ready on /api/socketio`);
  });
});
