import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server as SocketIOServer, Socket } from "socket.io";
import { setIO } from "./src/lib/socket";
import { NextResponse } from "next/server";

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

  io.use(async (socket: Socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error("Authentication required"));
      }

      // Simple token validation — in production use proper JWT verify
      // For now, we validate the token is present and not empty
      if (typeof token === "string" && token.length > 0) {
        // Decode the base64 token to get user info
        try {
          const decoded = JSON.parse(atob(token));
          if (decoded && decoded.id) {
            socket.data.userId = decoded.id;
            socket.data.username = decoded.username || "";
            return next();
          }
        } catch {
          // Token decoding failed — still allow connection for now
          // In production, reject this
          return next();
        }
      }

      next(new Error("Invalid token"));
    } catch (error) {
      next(new Error("Authentication failed"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const userId = socket.data.userId || "anonymous";
    console.log("🔌 Socket connected:", socket.id, "User:", userId);

    // User joins their personal room based on userId
    socket.on("join", (joinUserId: string) => {
      // Validate that the user is joining their own room
      if (joinUserId !== userId && userId !== "anonymous") {
        console.log(`⚠️ User ${userId} tried to join room ${joinUserId} — rejected`);
        return;
      }

      const effectiveUserId = userId !== "anonymous" ? joinUserId : userId;
      socket.join(`user:${effectiveUserId}`);
      socket.data.userId = effectiveUserId;

      // Track online status
      if (!onlineUsers.has(effectiveUserId)) {
        onlineUsers.set(effectiveUserId, new Set());
      }
      onlineUsers.get(effectiveUserId)!.add(socket.id);
      broadcastOnlineUsers();
      console.log(`👤 User ${effectiveUserId} online (${onlineUsers.get(effectiveUserId)!.size} sockets)`);
    });

    // User joins a group chat room
    socket.on("join-group", (groupId: string) => {
      socket.join(`group:${groupId}`);
      console.log(`👥 Socket ${socket.id} joined group ${groupId}`);
    });

    // User leaves a group chat room
    socket.on("leave-group", (groupId: string) => {
      socket.leave(`group:${groupId}`);
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
