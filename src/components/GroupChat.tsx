"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "@/lib/appwrite-session";
import UserAvatar from "@/components/UserAvatar";
import { HiPaperAirplane } from "react-icons/hi";
import { useSocket, useSocketEvent } from "@/lib/useSocket";
import toast from "react-hot-toast";

function timeAgo(date: string) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return Math.floor(s / 60) + "m";
  if (s < 86400) return Math.floor(s / 3600) + "h";
  return Math.floor(s / 86400) + "d";
}

export default function GroupChat({ groupId, isMember }: { groupId: string; isMember: boolean }) {
  const { data: session } = useSession();
  const user = session?.user as any;
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });
      if (!res.ok) throw new Error();
      const msg = await res.json();
      setMessages((prev) => (prev.find((m) => m.id === msg.id) ? prev : [...prev, msg]));
      setText("");
    } catch {
      toast.error("Failed to send");
    } finally {
      setSending(false);
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
    <div className="px-4 py-4 flex flex-col gap-3">
      <div className="flex flex-col gap-2 max-h-[55vh] overflow-y-auto pr-1">
        {loading && <p className="text-xs text-gray-400 py-4 text-center">Loading chat…</p>}
        {!loading && messages.length === 0 && (
          <p className="text-xs text-gray-400 py-4 text-center">No messages yet — say hi 👋</p>
        )}
        {messages.map((m) => {
          const mine = m.sender?.id === user?.id;
          return (
            <div key={m.id} className={`flex items-end gap-2 ${mine ? "justify-end" : "justify-start"}`}>
              {!mine && <UserAvatar user={m.sender} size="sm" />}
              <div className="max-w-[75%]">
                {!mine && (
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 ml-1 mb-0.5">{m.sender?.name}</p>
                )}
                <div
                  className={`px-4 py-2 rounded-2xl text-sm break-words ${
                    mine
                      ? "bg-primary-600 text-white rounded-br-md"
                      : "bg-gray-100 dark:bg-dark-700 text-gray-800 dark:text-gray-200 rounded-bl-md"
                  }`}
                >
                  {m.content}
                </div>
                <p className={`text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 ${mine ? "text-right" : "ml-1"}`}>
                  {timeAgo(m.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <form onSubmit={send} className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Message the group..."
          className="flex-1 glass-input rounded-xl px-4 py-2.5 text-sm"
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          className="w-10 h-10 bg-primary-600 hover:bg-primary-700 text-white rounded-xl flex items-center justify-center disabled:opacity-50 flex-shrink-0"
        >
          <HiPaperAirplane className="text-lg -rotate-45" />
        </button>
      </form>
    </div>
  );
}
