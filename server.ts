import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server as SocketIOServer } from "socket.io";
import { setIO } from "./src/lib/socket";

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

  io.on("connection", (socket) => {
    console.log("🔌 Socket connected:", socket.id);

    // User joins their personal room based on userId
    socket.on("join", (userId: string) => {
      socket.join(`user:${userId}`);
      socket.data.userId = userId;
      console.log(`👤 User ${userId} joined their room`);
    });

    // Store userId on socket for later use
    socket.on("register", (userId: string) => {
      socket.data.userId = userId;
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
        senderId: socket.data.userId,
        senderName: data.senderName,
      });
    });

    socket.on("stop-typing", (data: { receiverId: string }) => {
      socket.to(`user:${data.receiverId}`).emit("user-stop-typing", {
        senderId: socket.data.userId,
      });
    });

    // ========== CALL SIGNALING ==========
    // Incoming call: caller → receiver
    socket.on("call-offer", (data: { receiverId: string; offer: any; callerName: string; callerAvatar?: string; callType: "audio" | "video" }) => {
      console.log(`📞 Call offer from ${socket.data.userId} to ${data.receiverId} (${data.callType})`);
      socket.to(`user:${data.receiverId}`).emit("incoming-call", {
        callerId: socket.data.userId,
        callerName: data.callerName,
        callerAvatar: data.callerAvatar,
        offer: data.offer,
        callType: data.callType,
      });
    });

    // Call accepted: receiver → caller
    socket.on("call-answer", (data: { callerId: string; answer: any }) => {
      console.log(`📞 Call answer from ${socket.data.userId} to ${data.callerId}`);
      socket.to(`user:${data.callerId}`).emit("call-accepted", {
        answer: data.answer,
        receiverId: socket.data.userId,
      });
    });

    // Call rejected
    socket.on("call-reject", (data: { callerId: string }) => {
      console.log(`📞 Call rejected by ${socket.data.userId}`);
      socket.to(`user:${data.callerId}`).emit("call-rejected", {
        receiverId: socket.data.userId,
      });
    });

    // Call ended (by either party)
    socket.on("call-end", (data: { otherUserId: string }) => {
      console.log(`📞 Call ended by ${socket.data.userId}`);
      socket.to(`user:${data.otherUserId}`).emit("call-ended", {
        endedBy: socket.data.userId,
      });
    });

    // ICE candidate exchange
    socket.on("ice-candidate", (data: { targetUserId: string; candidate: any }) => {
      socket.to(`user:${data.targetUserId}`).emit("ice-candidate", {
        candidate: data.candidate,
        fromUserId: socket.data.userId,
      });
    });

    socket.on("disconnect", () => {
      // Notify all ongoing calls that this user disconnected
      console.log("🔌 Socket disconnected:", socket.id);
    });
  });

  httpServer.listen(port, () => {
    console.log(`> CampusConnect ready on http://${hostname}:${port}`);
    console.log(`> Socket.io ready on /api/socketio`);
  });
});
