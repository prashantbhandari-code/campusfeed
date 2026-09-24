"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "@/lib/appwrite-session";
import { useParams } from "next/navigation";
import UserAvatar from "@/components/UserAvatar";
import { HiArrowLeft, HiPaperAirplane, HiPhone, HiVideoCamera, HiPaperClip, HiMicrophone, HiStop, HiDocumentText, HiMusicNote, HiX, HiDotsHorizontal } from "react-icons/hi";
import CallModal from "@/components/CallModal";
import Link from "next/link";
import toast from "react-hot-toast";
import { formatDate } from "@/lib/utils";
import { useSocket, useSocketEvent } from "@/lib/useSocket";

export default function ChatPage() {
  const { data: session } = useSession();
  const params = useParams();
  const userId = params.id as string;
  const user = session?.user as any;
  const [messages, setMessages] = useState<any[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [otherUser, setOtherUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [typing, setTyping] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string; type: string } | null>(null);
  const [messageReactions, setMessageReactions] = useState<Record<string, any[]>>({});
  const [actionMsgId, setActionMsgId] = useState<string | null>(null);
  const [editingMsg, setEditingMsg] = useState<any>(null);
  const [replyToMsg, setReplyToMsg] = useState<any>(null);
  const pressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const sheetOpenedAtRef = useRef(0);
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
    // Only this conversation's partner — the poll delivers every message to me
    if (msg.sender?.id === userId) {
      setMessages((prev) => {
        if (prev.find((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    }
  }, [userId]);

  useSocketEvent("message-reaction", (data: { messageId: string; reactions: any[] }) => {
    if (data?.messageId && Array.isArray(data.reactions)) {
      setMessageReactions((prev) => ({ ...prev, [data.messageId]: data.reactions }));
    }
  }, []);

  useSocketEvent("message-edited", (data: { messageId: string; content: string; editedAt: string }) => {
    if (data?.messageId) {
      setMessages((prev) => prev.map((m) => (m.id === data.messageId ? { ...m, content: data.content, editedAt: data.editedAt } : m)));
    }
  }, []);

  useSocketEvent("message-deleted", (data: { messageId: string }) => {
    if (data?.messageId) {
      setMessages((prev) => prev.map((m) => (m.id === data.messageId ? { ...m, content: "", fileUrl: null, fileType: null, fileName: null, deletedForEveryone: true } : m)));
      setMessageReactions((prev) => { const next = { ...prev }; delete next[data.messageId]; return next; });
    }
  }, []);

  useSocketEvent("user-typing", (data: { senderId: string }) => {
    if (data.senderId === userId) setTyping(true);
  }, [userId]);

  useSocketEvent("user-stop-typing", (data: { senderId: string }) => {
    if (data.senderId === userId) setTyping(false);
  }, [userId]);

  useEffect(() => {
    const controller = new AbortController();
    fetchMessages(controller.signal);
    return () => controller.abort();
  }, [userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchMessages = async (signal?: AbortSignal) => {
    try {
      const res = await fetch(`/api/messages/${userId}`, { signal });
      const data = await res.json();
      const list: any[] = data.messages || data;
      setMessages(list);
      const rmap: Record<string, any[]> = {};
      list.forEach((m: any) => { if (m.reactions?.length) rmap[m.id] = m.reactions; });
      setMessageReactions(rmap);
      if (!otherUser) {
        const msg = list.find((m: any) => m.sender?.id === userId);
        if (msg) {
          setOtherUser(msg.sender);
        } else {
          const userRes = await fetch(`/api/users?userId=${userId}`);
          const users = await userRes.json();
          if (Array.isArray(users) && users.length > 0) setOtherUser(users[0]);
        }
      }
    } catch (error) { console.error("Message operation failed:", error); } finally {
      setLoading(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingMsg) { await handleEdit(); return; }
    if (!newMessage.trim() && !previewFile) return;

    try {
      const body: any = { receiverId: userId, content: newMessage };
      if (previewFile) {
        body.fileUrl = previewFile.url;
        body.fileType = previewFile.type;
        body.fileName = previewFile.name;
      }
      if (replyToMsg) body.replyToId = replyToMsg.id;
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const msg = await res.json();
      setMessages((prev) => [...prev, msg]);
      setNewMessage("");
      setPreviewFile(null);
      setReplyToMsg(null);
      stopTyping();
    } catch (error) { console.error("Message operation failed:", error); }
  };

  const uploadToServer = async (file: File): Promise<any> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    return res.json().catch(() => ({}));
  };

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    try {
      const data = await uploadToServer(file);
      if (data.url) {
        setPreviewFile({ url: data.url, name: data.fileName, type: data.fileType });
      } else {
        toast.error(data.error || "Upload failed");
      }
    } catch (error) { console.error("Message operation failed:", error); toast.error("Upload failed"); } finally {
      setUploading(false);
    }
  };

  // Voice notes skip the caption preview and go straight out
  const sendVoice = async (file: File) => {
    setUploading(true);
    try {
      const data = await uploadToServer(file);
      if (!data.url) { toast.error(data.error || "Voice upload failed"); return; }
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId: userId, content: "", fileUrl: data.url, fileType: data.fileType, fileName: data.fileName }),
      });
      if (!res.ok) { toast.error("Failed to send voice message"); return; }
      const msg = await res.json();
      setMessages((prev) => [...prev, msg]);
    } catch (error) { console.error("Message operation failed:", error); toast.error("Voice upload failed"); } finally {
      setUploading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Safari can't record webm — fall back to mp4, then the browser default
      let mime: string | undefined;
      for (const t of ["audio/webm", "audio/mp4"]) {
        try { if (MediaRecorder.isTypeSupported(t)) { mime = t; break; } } catch { /* older browsers */ }
      }
      const ext = mime === "audio/mp4" ? "mp4" : "webm";
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      recorder.onstop = async () => {
        const type = mime || "audio/webm";
        const blob = new Blob(audioChunksRef.current, { type });
        const file = new File([blob], `voice-${Date.now()}.${ext}`, { type });
        stream.getTracks().forEach(t => t.stop());
        await sendVoice(file);
      };
      recorder.start();
      setRecording(true);
    } catch (error) { console.error("Message operation failed:", error); toast.error("Microphone unavailable"); }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    try {
      const res = await fetch("/api/messages/" + messageId + "/reactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      });
      const reactions = await res.json();
      setMessageReactions(prev => ({ ...prev, [messageId]: reactions }));
      setActionMsgId(null);
    } catch (error) { console.error("Message operation failed:", error); }
  };

  const sheetMsg = messages.find((m) => m.id === actionMsgId) || null;
  const sheetIsMine = sheetMsg?.sender?.id === user?.id;

  const startLongPress = (msg: any) => {
    pressTimerRef.current = setTimeout(() => {
      setActionMsgId(msg.id);
      sheetOpenedAtRef.current = Date.now();
    }, 450);
  };
  const cancelLongPress = () => {
    if (pressTimerRef.current) { clearTimeout(pressTimerRef.current); pressTimerRef.current = null; }
  };
  const closeSheet = () => {
    // A long-press's touchend lands on the fresh backdrop — ignore that synthetic close
    if (Date.now() - sheetOpenedAtRef.current < 400) return;
    setActionMsgId(null);
  };

  const handleCopy = async (msg: any) => {
    try {
      await navigator.clipboard.writeText(msg.content);
      toast.success("Copied");
      setActionMsgId(null);
    } catch { toast.error("Couldn't copy message"); }
  };

  const handleDelete = async (msg: any, scope: "me" | "everyone") => {
    if (scope === "everyone" && !confirm("Delete this message for everyone?")) return;
    setActionMsgId(null);
    try {
      const res = await fetch(`/api/messages/${msg.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope }),
      });
      if (!res.ok) throw new Error();
      if (scope === "everyone") {
        setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, content: "", fileUrl: null, fileType: null, fileName: null, deletedForEveryone: true } : m)));
        setMessageReactions((prev) => { const next = { ...prev }; delete next[msg.id]; return next; });
        toast.success("Message deleted for everyone");
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== msg.id));
        toast.success("Message deleted");
      }
    } catch { toast.error("Couldn't delete message"); }
  };

  const handleEdit = async () => {
    if (!editingMsg) return;
    try {
      const res = await fetch(`/api/messages/${editingMsg.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newMessage }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `server responded ${res.status}`);
      }
      setMessages((prev) => prev.map((m) => (m.id === editingMsg.id ? { ...m, content: newMessage.trim(), editedAt: new Date().toISOString() } : m)));
      setEditingMsg(null);
      setNewMessage("");
      toast.success("Message edited");
    } catch (error) {
      toast.error(`Couldn't edit — ${error instanceof Error ? error.message : "try again"}`);
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  return (
    <div className="h-[calc(100dvh-3.5rem)] md:h-[calc(100vh-0rem)] flex flex-col max-w-3xl mx-auto bg-white dark:bg-dark-900 border-x border-gray-200 dark:border-white/5">
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
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-dark-900">
        {messages.map((msg: any, i: number) => {
          const isMine = msg.sender.id === user?.id;
          const newGroup = i === 0 || messages[i - 1].sender.id !== msg.sender.id;
          return (
            <div key={msg.id} className={`flex gap-2 items-start ${isMine ? "justify-end" : "justify-start"} ${newGroup ? "mt-3" : "mt-0.5"}`}>
              {!isMine && (newGroup ? <UserAvatar user={msg.sender} size="sm" /> : <div className="w-8 flex-shrink-0" aria-hidden="true" />)}
              <div
                className={`max-w-[75%] min-w-0 flex flex-col select-none ${isMine ? "items-end" : ""}`}
                onTouchStart={() => startLongPress(msg)}
                onTouchEnd={cancelLongPress}
                onTouchMove={cancelLongPress}
                onContextMenu={(e) => { e.preventDefault(); setActionMsgId(msg.id); }}
              >
                {!msg.deletedForEveryone && msg.fileUrl && (
                  <div className="mb-1">
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
                {!msg.deletedForEveryone && (msg.content || msg.replyTo) && (
                  <div
                    className={`px-4 py-2 rounded-2xl text-sm break-words ${
                      isMine
                        ? "bg-primary-600 text-white rounded-br-md"
                        : "bg-gray-200 dark:bg-dark-600 text-gray-800 dark:text-gray-200 rounded-bl-md"
                    }`}
                  >
                    {msg.replyTo && (
                      <div className={`mb-1.5 px-2 py-1 rounded-lg text-xs border-l-2 ${
                        isMine
                          ? "border-white/60 bg-white/15 text-white/90"
                          : "border-gray-400 bg-black/[0.06] dark:bg-white/10 text-gray-600 dark:text-gray-300"
                      }`}>
                        <span className="font-semibold block truncate">
                          {msg.replyTo.deletedForEveryone
                            ? "Deleted message"
                            : msg.replyTo.senderId === user?.id
                              ? "You"
                              : msg.replyTo.sender?.name || "Message"}
                        </span>
                        <span className="block truncate">
                          {msg.replyTo.deletedForEveryone
                            ? "🚫 This message was deleted"
                            : msg.replyTo.content || "📎 Attachment"}
                        </span>
                      </div>
                    )}
                    {msg.content}
                  </div>
                )}
                {msg.deletedForEveryone && (
                  <div className={`px-4 py-2 rounded-2xl text-sm italic ${
                    isMine
                      ? "bg-gray-200 dark:bg-dark-700 text-gray-500 dark:text-gray-400"
                      : "bg-gray-200 dark:bg-dark-600 text-gray-500 dark:text-gray-400"
                  }`}>
                    🚫 This message was deleted
                  </div>
                )}
                {/* Existing reactions */}
                {(messageReactions[msg.id]?.length ?? 0) > 0 && (
                  <div className={`flex flex-wrap gap-1 mt-1 ${isMine ? "justify-end" : ""}`}>
                    {messageReactions[msg.id].map((r: any) => (
                      <span key={r.id} className="text-xs bg-white dark:bg-dark-700 border border-gray-200 dark:border-dark-500 rounded-full px-1.5 py-0.5 shadow-sm">
                        {r.emoji}
                      </span>
                    ))}
                  </div>
                )}
                <div className={`flex items-center gap-2 mt-1 ${isMine ? "justify-end" : "justify-start"}`}>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500">
                    {msg.editedAt ? "edited · " : ""}{formatDate(msg.createdAt)}
                  </p>
                  <button
                    onClick={() => setActionMsgId(actionMsgId === msg.id ? null : msg.id)}
                    aria-label="Message actions"
                    aria-expanded={actionMsgId === msg.id}
                    className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-all"
                  >
                    <HiDotsHorizontal className="text-base" />
                  </button>
                </div>
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

      {/* Reply / edit banner */}
      {(editingMsg || replyToMsg) && !previewFile && (
        <div className="bg-white dark:bg-dark-900 border-t border-gray-200 dark:border-white/10 px-4 py-2 flex items-center gap-2">
          <div className="flex-1 min-w-0 text-xs">
            <p className="font-semibold text-gray-700 dark:text-gray-300">
              {editingMsg ? "✏️ Editing message" : `↩️ Reply to ${replyToMsg.sender?.id === user?.id ? "yourself" : replyToMsg.sender?.name || "them"}`}
            </p>
            <p className="text-gray-500 dark:text-gray-400 truncate">
              {editingMsg ? editingMsg.content : replyToMsg.content || "📎 Attachment"}
            </p>
          </div>
          <button
            onClick={() => { setEditingMsg(null); setReplyToMsg(null); setNewMessage(""); }}
            aria-label="Cancel"
            className="p-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
          >
            <HiX className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Input — pinned to bottom */}
      <form onSubmit={handleSend} className="bg-white dark:bg-dark-900 border-t border-gray-200 dark:border-white/10 p-3 flex gap-2 items-center flex-shrink-0 mb-16 lg:mb-0">
        <label htmlFor="file-upload-msg" className="cursor-pointer"><input id="file-upload-msg" type="file" ref={fileInputRef} className="sr-only" accept="image/*,video/*,.pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx,.zip,.rar" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); e.target.value = ""; }} /></label>
        <label htmlFor="audio-upload-msg" className="cursor-pointer"><input id="audio-upload-msg" type="file" ref={audioInputRef} className="sr-only" accept="audio/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); e.target.value = ""; }} /></label>

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
          placeholder={uploading ? "Uploading..." : recording ? "Recording... tap stop to send" : "Type a message..."}
          disabled={uploading}
          className="flex-1 min-w-0 bg-gray-100 dark:bg-dark-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-primary-500 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
        />
        <button
          type="submit"
          disabled={!newMessage.trim() && !previewFile}
          className="w-12 h-12 bg-primary-600 hover:bg-primary-700 text-white rounded-xl flex items-center justify-center transition-all disabled:opacity-50 flex-shrink-0"
        >
          <HiPaperAirplane className="text-xl -rotate-45" />
        </button>
      </form>

      {/* Message action sheet (tap ⋮, long-press, or right-click a message) */}
      {sheetMsg && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={closeSheet}>
          <div
            className="w-full max-w-3xl bg-white dark:bg-dark-800 rounded-t-2xl p-4 pb-8 border-t border-gray-200 dark:border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center gap-1 pb-3 border-b border-gray-100 dark:border-white/[0.06] mb-2">
              {["👍","❤️","😂","😮","😢","🔥"].map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleReaction(sheetMsg.id, emoji)}
                  className="text-2xl hover:scale-125 transition-transform px-1.5 py-1"
                >
                  {emoji}
                </button>
              ))}
            </div>
            <div className="space-y-0.5">
              {!sheetMsg.deletedForEveryone && (
                <button
                  onClick={() => { setReplyToMsg(sheetMsg); setActionMsgId(null); }}
                  className="w-full text-left px-4 py-3 text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/[0.06] rounded-xl flex items-center gap-3"
                >
                  ↩️ Reply
                </button>
              )}
              {sheetMsg.content && !sheetMsg.deletedForEveryone && (
                <button
                  onClick={() => handleCopy(sheetMsg)}
                  className="w-full text-left px-4 py-3 text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/[0.06] rounded-xl flex items-center gap-3"
                >
                  📋 Copy
                </button>
              )}
              {sheetIsMine && sheetMsg.content && !sheetMsg.deletedForEveryone && (
                <button
                  onClick={() => { setEditingMsg(sheetMsg); setNewMessage(sheetMsg.content); setActionMsgId(null); }}
                  className="w-full text-left px-4 py-3 text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/[0.06] rounded-xl flex items-center gap-3"
                >
                  ✏️ Edit
                </button>
              )}
              <button
                onClick={() => handleDelete(sheetMsg, "me")}
                className="w-full text-left px-4 py-3 text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/[0.06] rounded-xl flex items-center gap-3"
              >
                🗑️ Delete for me
              </button>
              {sheetIsMine && !sheetMsg.deletedForEveryone && (
                <button
                  onClick={() => handleDelete(sheetMsg, "everyone")}
                  className="w-full text-left px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl flex items-center gap-3"
                >
                  🚫 Delete for everyone
                </button>
              )}
            </div>
            <button
              onClick={() => setActionMsgId(null)}
              className="w-full mt-3 py-2.5 text-sm font-semibold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-white/[0.06] rounded-xl hover:bg-gray-200 dark:hover:bg-white/[0.1] transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {showOutgoingCall && otherUser && user && (
        <CallModal isOpen={showOutgoingCall} onClose={() => setShowOutgoingCall(false)} otherUser={otherUser} currentUser={user} callType={outgoingCallType} />
      )}

    </div>
  );
}
