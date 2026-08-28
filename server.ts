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
      console.log(`👤 User ${userId} joined their room`);
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

    // Store userId on socket for later use
    socket.on("register", (userId: string) => {
      socket.data.userId = userId;
    });

    socket.on("disconnect", () => {
      console.log("🔌 Socket disconnected:", socket.id);
    });
  });

  httpServer.listen(port, () => {
    console.log(`> CampusConnect ready on http://${hostname}:${port}`);
    console.log(`> Socket.io ready on /api/socketio`);
  });
});
