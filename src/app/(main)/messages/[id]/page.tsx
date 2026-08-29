"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import UserAvatar from "@/components/UserAvatar";
import { HiArrowLeft, HiPaperAirplane, HiPhone, HiVideoCamera, HiPaperClip, HiMicrophone, HiStop, HiDocumentText, HiMusicNote, HiX } from "react-icons/hi";
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
  const [uploading, setUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string; type: string } | null>(null);
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const [showOutgoingCall, setShowOutgoingCall] = useState(false);
  const [outgoingCallType, setOutgoingCallType] = useState<"audio" | "video">("audio");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasTypedRef = useRef(false);

  const { isConnected, onlineUsers, emit } = useSocket(user?.id);

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
    if (!newMessage.trim() && !previewFile) return;

    try {
      const body: any = { receiverId: userId, content: newMessage };
      if (previewFile) {
        body.fileUrl = previewFile.url;
        body.fileType = previewFile.type;
        body.fileName = previewFile.name;
      }
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const msg = await res.json();
      setMessages([...messages, msg]);
      setNewMessage("");
      setPreviewFile(null);
      stopTyping();
    } catch {}
  };

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.url) {
        setPreviewFile({ url: data.url, name: data.fileName, type: data.fileType });
      }
    } catch {} finally {
      setUploading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: "audio/webm" });
        await handleFileUpload(file);
        stream.getTracks().forEach(t => t.stop());
      };
      recorder.start();
      setRecording(true);
    } catch {}
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  return (
    <div className="h-[calc(100vh-4rem)] md:h-[calc(100vh-4rem)] flex flex-col max-w-3xl mx-auto bg-white dark:bg-dark-900 border-x border-gray-200 dark:border-white/5">
      {/* Header */}
      <div className="bg-white dark:bg-dark-900 border-b border-gray-200 dark:border-white/10 p-4 flex items-center gap-3 flex-shrink-0">
        <Link href="/messages" className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white md:hidden">
          <HiArrowLeft className="text-2xl" />
        </Link>
        <Link href="/messages" className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hidden md:block mr-2">
          <HiArrowLeft className="text-xl" />
        </Link>
        {otherUser && (
          <>
            <UserAvatar user={otherUser} size="md" />
            <div className="flex-1">
              <p className="font-semibold">{otherUser.name}</p>
              <div className="flex items-center gap-2">
                <p className="text-xs text-gray-400 dark:text-gray-500">@{otherUser.username}</p>
                <span className={`w-2 h-2 rounded-full ${onlineUsers.includes(userId) ? "bg-green-400" : "bg-gray-500"}`} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => { setOutgoingCallType("audio"); setShowOutgoingCall(true); }} className="w-10 h-10 rounded-full bg-gray-100 dark:bg-white/5 hover:bg-green-500/20 text-gray-500 dark:text-gray-400 hover:text-green-500 dark:hover:text-green-400 flex items-center justify-center transition-all" title="Audio call"><HiPhone className="text-lg" /></button>
              <button onClick={() => { setOutgoingCallType("video"); setShowOutgoingCall(true); }} className="w-10 h-10 rounded-full bg-gray-100 dark:bg-white/5 hover:bg-blue-500/20 text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 flex items-center justify-center transition-all" title="Video call"><HiVideoCamera className="text-lg" /></button>
            </div>
          </>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-dark-900">
        {messages.map((msg: any) => {
          const isMine = msg.sender.id === user?.id;
          return (
            <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[70%] ${isMine ? "order-2" : ""}`}>
                {!isMine && <UserAvatar user={msg.sender} size="sm" />}
                {msg.fileUrl && (
                  <div className="mt-1 mb-1">
                    {msg.fileType === "image" ? (
                      <img src={msg.fileUrl} alt="" className="rounded-2xl max-w-[250px] max-h-[300px] object-cover cursor-pointer" onClick={() => window.open(msg.fileUrl, "_blank")} />
                    ) : msg.fileType === "audio" ? (
                      <div className="bg-gray-100 dark:bg-dark-700 rounded-2xl p-3 min-w-[200px]">
                        <audio controls src={msg.fileUrl} className="w-full h-8" style={{ filter: "invert(0.8)" }} />
                        {msg.fileName && <p className="text-[10px] text-gray-500 mt-1 truncate">{msg.fileName}</p>}
                      </div>
                    ) : msg.fileType === "video" ? (
                      <video controls src={msg.fileUrl} className="rounded-2xl max-w-[280px] max-h-[300px]" />
                    ) : (
                      <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 p-3 rounded-2xl ${isMine ? "bg-primary-700 text-white" : "bg-gray-100 dark:bg-dark-700 text-gray-700 dark:text-gray-200"} hover:opacity-80 transition-all`}>                        <HiDocumentText className="w-8 h-8 text-blue-500 dark:text-blue-400 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{msg.fileName || "File"}</p>
                          <p className="text-[10px] text-gray-400 dark:text-gray-500">Tap to download</p>
                        </div>
                      </a>
                    )}
                  </div>
                )}
                {msg.content && (
                  <div
                    className={`mt-1 px-4 py-2 rounded-2xl text-sm ${
                      isMine
                        ? "bg-primary-600 text-white rounded-br-md"
                        : "bg-gray-200 dark:bg-dark-600 text-gray-800 dark:text-gray-200 rounded-bl-md"
                    }`}
                  >
                    {msg.content}
                  </div>
                )}
                <p className={`text-[10px] text-gray-400 dark:text-gray-500 mt-1 ${isMine ? "text-right" : ""}`}>
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

      {/* File preview */}
      {previewFile && (
        <div className="bg-white dark:bg-dark-900 border-t border-gray-200 dark:border-white/10 px-4 py-2 flex items-center gap-2">
          {previewFile.type === "image" ? (
            <img src={previewFile.url} alt="" className="w-12 h-12 rounded-lg object-cover" />
          ) : previewFile.type === "audio" ? (
            <HiMusicNote className="w-6 h-6 text-green-400" />
          ) : (
            <HiDocumentText className="w-6 h-6 text-blue-400" />
          )}
          <span className="text-sm text-gray-600 dark:text-gray-300 truncate flex-1">{previewFile.name}</span>
          <button onClick={() => setPreviewFile(null)} className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400"><HiX className="w-5 h-5" /></button>
        </div>
      )}

      {/* Input — pinned to bottom */}
      <form onSubmit={handleSend} className="bg-white dark:bg-dark-900 border-t border-gray-200 dark:border-white/10 p-3 flex gap-2 items-center flex-shrink-0 mb-16 md:mb-0">
        <input type="file" ref={fileInputRef} className="hidden" accept="image/*,.pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx,.zip,.rar" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); e.target.value = ""; }} />
        <input type="file" ref={audioInputRef} className="hidden" accept="audio/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); e.target.value = ""; }} />

        <button type="button" onClick={() => fileInputRef.current?.click()} className="w-10 h-10 rounded-full bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center justify-center transition-all flex-shrink-0" title="Attach file">
          <HiPaperClip className="text-xl" />
        </button>

        {recording ? (
          <button type="button" onClick={stopRecording} className="w-10 h-10 rounded-full bg-red-500 animate-pulse flex items-center justify-center flex-shrink-0">
            <HiStop className="text-xl text-white" />
          </button>
        ) : (
          <button type="button" onClick={startRecording} className="w-10 h-10 rounded-full bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center justify-center transition-all flex-shrink-0" title="Voice note">
            <HiMicrophone className="text-xl" />
          </button>
        )}

        <input
          type="text"
          value={newMessage}
          onChange={(e) => { setNewMessage(e.target.value); handleTyping(); }}
          placeholder={uploading ? "Uploading..." : "Type a message..."}
          disabled={uploading}
          className="flex-1 bg-gray-100 dark:bg-dark-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-primary-500 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
        />
        <button
          type="submit"
          disabled={!newMessage.trim() && !previewFile}
          className="w-12 h-12 bg-primary-600 hover:bg-primary-700 text-white rounded-xl flex items-center justify-center transition-all disabled:opacity-50 flex-shrink-0"
        >
          <HiPaperAirplane className="text-xl -rotate-45" />
        </button>
      </form>

      {showOutgoingCall && otherUser && user && (
        <CallModal isOpen={showOutgoingCall} onClose={() => setShowOutgoingCall(false)} otherUser={otherUser} currentUser={user} callType={outgoingCallType} />
      )}

    </div>
  );
}
