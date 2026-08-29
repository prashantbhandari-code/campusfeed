"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import UserAvatar from "@/components/UserAvatar";
import { HiArrowLeft, HiPaperAirplane, HiPhone, HiVideoCamera } from "react-icons/hi";
import CallModal from "@/components/CallModal";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { useSocket, useSocketEvent } from "@/lib/useSocket";

export default function ChatPage() {
  const { data: session } = useSession();
  const params = useParams();
  const userId = params.id as string;
  const user = session?.user as any;
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [otherUser, setOtherUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [typing, setTyping] = useState(false);
  const [showOutgoingCall, setShowOutgoingCall] = useState(false);
  const [outgoingCallType, setOutgoingCallType] = useState<"audio" | "video">("audio");
  const [showIncomingCall, setShowIncomingCall] = useState(false);
  const [incomingCallData, setIncomingCallData] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasTypedRef = useRef(false);

  const { isConnected, emit } = useSocket(user?.id);

  const handleTyping = () => {
    if (!hasTypedRef.current) {
      hasTypedRef.current = true;
      emit("typing", { receiverId: userId, senderName: user?.name });
    }
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      hasTypedRef.current = false;
      emit("stop-typing", { receiverId: userId });
    }, 2000);
  };

  const stopTyping = () => {
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    hasTypedRef.current = false;
    emit("stop-typing", { receiverId: userId });
  };

  useSocketEvent("incoming-call", (data: any) => {
    setIncomingCallData(data);
    setShowIncomingCall(true);
  }, []);

  useSocketEvent("new-message", (msg: any) => {
    if (msg.sender.id === userId || msg.receiverId === user?.id) {
      setMessages((prev) => {
        if (prev.find((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    }
  }, [userId, user?.id]);

  useSocketEvent("user-typing", (data: { senderId: string }) => {
    if (data.senderId === userId) setTyping(true);
  }, [userId]);

  useSocketEvent("user-stop-typing", (data: { senderId: string }) => {
    if (data.senderId === userId) setTyping(false);
  }, [userId]);

  useEffect(() => {
    fetchMessages();
  }, [userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/messages/${userId}`);
      const data = await res.json();
      setMessages(data);
      if (!otherUser) {
        const msg = data.find((m: any) => m.sender.id === userId);
        if (msg) {
          setOtherUser(msg.sender);
        } else {
          const userRes = await fetch(`/api/users?userId=${userId}`);
          const users = await userRes.json();
          if (users.length > 0) setOtherUser(users[0]);
        }
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId: userId, content: newMessage }),
      });
      const msg = await res.json();
      setMessages([...messages, msg]);
      setNewMessage("");
      stopTyping();
    } catch {}
  };

  return (
    <div className="h-[calc(100vh-4rem)] md:h-[calc(100vh-4rem)] flex flex-col max-w-3xl mx-auto">
      {/* Header */}
      <div className="glass border-b border-white/10 p-4 flex items-center gap-3 flex-shrink-0">
        <Link href="/messages" className="text-gray-400 hover:text-white md:hidden">
          <HiArrowLeft className="text-2xl" />
        </Link>
        <Link href="/messages" className="text-gray-400 hover:text-white hidden md:block mr-2">
          <HiArrowLeft className="text-xl" />
        </Link>
        {otherUser && (
          <>
            <UserAvatar user={otherUser} size="md" />
            <div className="flex-1">
              <p className="font-semibold">{otherUser.name}</p>
              <div className="flex items-center gap-2">
                <p className="text-xs text-gray-500">@{otherUser.username}</p>
                <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-400" : "bg-gray-500"}`} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => { setOutgoingCallType("audio"); setShowOutgoingCall(true); }} className="w-10 h-10 rounded-full bg-white/5 hover:bg-green-500/20 text-gray-400 hover:text-green-400 flex items-center justify-center transition-all" title="Audio call"><HiPhone className="text-lg" /></button>
              <button onClick={() => { setOutgoingCallType("video"); setShowOutgoingCall(true); }} className="w-10 h-10 rounded-full bg-white/5 hover:bg-blue-500/20 text-gray-400 hover:text-blue-400 flex items-center justify-center transition-all" title="Video call"><HiVideoCamera className="text-lg" /></button>
            </div>
          </>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg: any) => {
          const isMine = msg.sender.id === user?.id;
          return (
            <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[70%] ${isMine ? "order-2" : ""}`}>
                {!isMine && <UserAvatar user={msg.sender} size="sm" />}
                <div
                  className={`mt-1 px-4 py-2 rounded-2xl text-sm ${
                    isMine
                      ? "bg-primary-600 text-white rounded-br-md"
                      : "bg-dark-600 text-gray-200 rounded-bl-md"
                  }`}
                >
                  {msg.content}
                </div>
                <p className={`text-[10px] text-gray-500 mt-1 ${isMine ? "text-right" : ""}`}>
                  {formatDate(msg.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
        {typing && (
          <div className="flex items-center gap-2 text-gray-500 text-xs px-2">
            <span className="flex gap-0.5">
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </span>
            {otherUser?.name} is typing...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input — pinned to bottom */}
      <form onSubmit={handleSend} className="glass border-t border-white/10 p-3 flex gap-3 flex-shrink-0 mb-16 md:mb-0">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => { setNewMessage(e.target.value); handleTyping(); }}
          placeholder="Type a message..."
          className="flex-1 bg-dark-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
        <button
          type="submit"
          disabled={!newMessage.trim()}
          className="w-12 h-12 bg-primary-600 hover:bg-primary-700 rounded-xl flex items-center justify-center transition-all disabled:opacity-50 flex-shrink-0"
        >
          <HiPaperAirplane className="text-xl -rotate-45" />
        </button>
      </form>

      {showOutgoingCall && otherUser && user && (
        <CallModal isOpen={showOutgoingCall} onClose={() => setShowOutgoingCall(false)} otherUser={otherUser} currentUser={user} callType={outgoingCallType} />
      )}
      {showIncomingCall && incomingCallData && user && (
        <CallModal isOpen={showIncomingCall} onClose={() => { setShowIncomingCall(false); setIncomingCallData(null); }} otherUser={{ id: incomingCallData.callerId, name: incomingCallData.callerName, username: "", avatar: incomingCallData.callerAvatar }} currentUser={user} callType={incomingCallData.callType} isIncoming offer={incomingCallData.offer} />
      )}
    </div>
  );
}
