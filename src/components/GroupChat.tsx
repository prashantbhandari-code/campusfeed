"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "@/lib/appwrite-session";
import UserAvatar from "@/components/UserAvatar";
import {
  HiPaperAirplane,
  HiPaperClip,
  HiMicrophone,
  HiStop,
  HiDocumentText,
  HiMusicNote,
  HiX,
  HiDotsHorizontal,
} from "react-icons/hi";
import { useSocket, useSocketEvent } from "@/lib/useSocket";
import toast from "react-hot-toast";

function timeAgo(date: string) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return Math.floor(s / 60) + "m";
  if (s < 86400) return Math.floor(s / 3600) + "h";
  return Math.floor(s / 86400) + "d";
}

export default function GroupChat({
  groupId,
  isMember,
  isAdmin = false,
  onRead,
}: {
  groupId: string;
  isMember: boolean;
  isAdmin?: boolean;
  onRead?: () => void;
}) {
  const { data: session } = useSession();
  const user = session?.user as any;
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string; type: string } | null>(null);
  const [recording, setRecording] = useState(false);
  const [menuMsgId, setMenuMsgId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { emit } = useSocket(user?.id);

  useEffect(() => {
    if (!isMember) {
      setLoading(false);
      return;
    }
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/groups/${groupId}/messages`);
        if (res.ok && alive) setMessages(await res.json());
        else if (alive) setMessages([]);
        // Server already marked read; sync the tab badge too
        onRead?.();
      } catch (error) {
        console.error("Group chat load failed:", error);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    emit("join-group", { groupId }); // joins the WS room; accepted as a no-op over REST
    return () => {
      alive = false;
      emit("leave-group", { groupId });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, isMember]);

  useSocketEvent(
    "new-group-message",
    (msg: any) => {
      if (msg?.groupId !== groupId) return;
      setMessages((prev) => (prev.find((m) => m.id === msg.id) ? prev : [...prev, msg]));
    },
    [groupId]
  );

  useSocketEvent(
    "group-message-deleted",
    (data: { messageId: string; groupId: string }) => {
      if (data?.groupId !== groupId) return;
      setMessages((prev) => prev.filter((m) => m.id !== data.messageId));
    },
    [groupId]
  );

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
      if (data.url) setPreviewFile({ url: data.url, name: data.fileName, type: data.fileType });
      else toast.error(data.error || "Upload failed");
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const sendPayload = async (body: Record<string, any>) => {
    const res = await fetch(`/api/groups/${groupId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error();
    const msg = await res.json();
    setMessages((prev) => (prev.find((m) => m.id === msg.id) ? prev : [...prev, msg]));
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending || uploading) return;
    if (!text.trim() && !previewFile) return;
    setSending(true);
    try {
      await sendPayload({
        content: text,
        fileUrl: previewFile?.url,
        fileType: previewFile?.type,
        fileName: previewFile?.name,
      });
      setText("");
      setPreviewFile(null);
    } catch {
      toast.error("Failed to send");
    } finally {
      setSending(false);
    }
  };

  // Voice notes skip the caption preview and go straight out
  const sendVoice = async (file: File) => {
    setUploading(true);
    try {
      const data = await uploadToServer(file);
      if (!data.url) {
        toast.error("Voice upload failed");
        return;
      }
      await sendPayload({ content: "", fileUrl: data.url, fileType: data.fileType, fileName: data.fileName });
    } catch {
      toast.error("Voice upload failed");
    } finally {
      setUploading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Safari can't record webm — fall back to mp4, then the browser default
      let mime: string | undefined;
      for (const t of ["audio/webm", "audio/mp4"]) {
        try {
          if (MediaRecorder.isTypeSupported(t)) {
            mime = t;
            break;
          }
        } catch {
          /* older browsers */
        }
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
        stream.getTracks().forEach((t) => t.stop());
        await sendVoice(file);
      };
      recorder.start();
      setRecording(true);
    } catch {
      toast.error("Microphone unavailable");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  const deleteMessage = async (msg: any) => {
    setMenuMsgId(null);
    if (!confirm("Delete this message for everyone?")) return;
    try {
      const res = await fetch(`/api/groups/${groupId}/messages`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId: msg.id }),
      });
      if (!res.ok) throw new Error();
      setMessages((prev) => prev.filter((m) => m.id !== msg.id));
    } catch {
      toast.error("Couldn't delete message");
    }
  };

  if (!isMember) {
    return (
      <div className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
        Join this group to chat with its members.
      </div>
    );
  }

  return (
    <div className="px-4 py-4 flex flex-col gap-3" onClick={() => setMenuMsgId(null)}>
      <div className="flex flex-col gap-2 max-h-[55vh] overflow-y-auto pr-1">
        {loading && <p className="text-xs text-gray-400 py-4 text-center">Loading chat…</p>}
        {!loading && messages.length === 0 && (
          <p className="text-xs text-gray-400 py-4 text-center">No messages yet — say hi 👋</p>
        )}
        {messages.map((m) => {
          const mine = m.sender?.id === user?.id;
          const canDelete = mine || isAdmin;
          return (
            <div key={m.id} className={`group/msg flex items-end gap-2 ${mine ? "justify-end" : "justify-start"}`}>
              {!mine && <UserAvatar user={m.sender} size="sm" />}
              <div className="max-w-[75%] min-w-0 relative">
                {!mine && (
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 ml-1 mb-0.5">{m.sender?.name}</p>
                )}

                {m.fileUrl && (
                  <div className="mb-1">
                    {m.fileType === "image" ? (
                      <img
                        src={m.fileUrl}
                        alt=""
                        className="rounded-2xl max-w-[250px] max-h-[300px] object-cover cursor-pointer"
                        onClick={() => window.open(m.fileUrl, "_blank")}
                      />
                    ) : m.fileType === "audio" ? (
                      <div className="bg-gray-100 dark:bg-dark-700 rounded-2xl p-3 min-w-[200px]">
                        <audio controls src={m.fileUrl} className="w-full h-8" style={{ filter: "invert(0.8)" }} />
                        {m.fileName && <p className="text-[10px] text-gray-500 mt-1 truncate">{m.fileName}</p>}
                      </div>
                    ) : m.fileType === "video" ? (
                      <video controls src={m.fileUrl} className="rounded-2xl max-w-[280px] max-h-[300px]" />
                    ) : (
                      <a
                        href={m.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center gap-2 p-3 rounded-2xl ${
                          mine ? "bg-primary-700 text-white" : "bg-gray-100 dark:bg-dark-700 text-gray-700 dark:text-gray-200"
                        } hover:opacity-80 transition-all`}
                      >
                        <HiDocumentText className="w-8 h-8 text-blue-500 dark:text-blue-400 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{m.fileName || "File"}</p>
                          <p className="text-[10px] opacity-70">Tap to download</p>
                        </div>
                      </a>
                    )}
                  </div>
                )}

                {m.content && (
                  <div
                    className={`px-4 py-2 rounded-2xl text-sm break-words ${
                      mine
                        ? "bg-primary-600 text-white rounded-br-md"
                        : "bg-gray-100 dark:bg-dark-700 text-gray-800 dark:text-gray-200 rounded-bl-md"
                    }`}
                  >
                    {m.content}
                  </div>
                )}

                <div className={`flex items-center gap-1.5 mt-0.5 ${mine ? "justify-end" : "ml-1"}`}>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500">{timeAgo(m.createdAt)}</p>
                  {canDelete && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuMsgId(menuMsgId === m.id ? null : m.id);
                      }}
                      aria-label="Message actions"
                      className="p-0.5 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10"
                    >
                      <HiDotsHorizontal className="text-sm" />
                    </button>
                  )}
                </div>

                {menuMsgId === m.id && (
                  <div
                    className={`absolute z-30 top-full mt-1 w-44 bg-white dark:bg-dark-700 border border-gray-200 dark:border-white/[0.1] rounded-xl shadow-xl py-1 overflow-hidden ${mine ? "right-0" : "left-0"}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {m.content && (
                      <button
                        onClick={async () => {
                          setMenuMsgId(null);
                          try {
                            await navigator.clipboard.writeText(m.content);
                            toast.success("Copied");
                          } catch {
                            toast.error("Couldn't copy");
                          }
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/[0.06]"
                      >
                        📋 Copy
                      </button>
                    )}
                    <button
                      onClick={() => deleteMessage(m)}
                      className="w-full text-left px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
                    >
                      🗑️ Delete for everyone
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {previewFile && (
        <div className="bg-gray-100 dark:bg-dark-700 rounded-xl px-3 py-2 flex items-center gap-2">
          {previewFile.type === "image" ? (
            <img src={previewFile.url} alt="" className="w-10 h-10 rounded-lg object-cover" />
          ) : previewFile.type === "audio" ? (
            <HiMusicNote className="text-green-500" />
          ) : (
            <HiDocumentText className="text-blue-500" />
          )}
          <span className="text-xs text-gray-600 dark:text-gray-300 truncate flex-1">{previewFile.name}</span>
          <button onClick={() => setPreviewFile(null)} aria-label="Remove attachment" className="text-gray-400 hover:text-red-500">
            <HiX className="w-4 h-4" />
          </button>
        </div>
      )}

      <form onSubmit={send} className="flex gap-2 items-center">
        <label htmlFor="group-file-upload" className="cursor-pointer">
          <input
            id="group-file-upload"
            type="file"
            ref={fileInputRef}
            className="sr-only"
            accept="image/*,video/*,.pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx,.zip,.rar"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFileUpload(f);
              e.target.value = "";
            }}
          />
          <span className="w-10 h-10 rounded-full bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 flex items-center justify-center transition-all">
            <HiPaperClip className="text-lg" />
          </span>
        </label>

        {recording ? (
          <button
            type="button"
            onClick={stopRecording}
            className="w-10 h-10 rounded-full bg-red-500 animate-pulse flex items-center justify-center"
            aria-label="Stop recording"
          >
            <HiStop className="text-lg text-white" />
          </button>
        ) : (
          <button
            type="button"
            onClick={startRecording}
            className="w-10 h-10 rounded-full bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 flex items-center justify-center transition-all"
            aria-label="Voice note"
          >
            <HiMicrophone className="text-lg" />
          </button>
        )}

        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={uploading ? "Uploading…" : recording ? "Recording… tap stop to send" : "Message the group…"}
          disabled={uploading}
          className="flex-1 min-w-0 glass-input rounded-xl px-4 py-2.5 text-sm disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={(!text.trim() && !previewFile) || sending || uploading}
          className="w-10 h-10 bg-primary-600 hover:bg-primary-700 text-white rounded-xl flex items-center justify-center disabled:opacity-50 flex-shrink-0"
        >
          <HiPaperAirplane className="text-lg -rotate-45" />
        </button>
      </form>
    </div>
  );
}
