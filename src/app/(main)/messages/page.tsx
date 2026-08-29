"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import UserAvatar from "@/components/UserAvatar";
import { formatDate } from "@/lib/utils";
import { useSocket } from "@/lib/useSocket";
import { HiPencilSquare, HiArrowsPointingOut, HiXMark } from "react-icons/hi2";

export default function MessagesPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const user = session?.user as any;
  const { onlineUsers } = useSocket(user?.id);
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      const res = await fetch("/api/messages");
      const data = await res.json();
      setConversations(data);
    } catch {} finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-4 md:py-8">
      {/* Instagram-style card */}
      <div className="bg-dark-800 rounded-2xl border border-white/10 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h2 className="text-lg font-bold">{user?.name?.split(" ")[0]}</h2>
          <div className="flex items-center gap-3">
            <button className="text-gray-400 hover:text-white transition-colors" title="Expand">
              <HiArrowsPointingOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Conversation list */}
        <div className="max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="p-4 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse flex items-center gap-3">
                  <div className="w-14 h-14 bg-dark-600 rounded-full" />
                  <div className="flex-1">
                    <div className="h-4 bg-dark-600 rounded w-1/3 mb-2" />
                    <div className="h-3 bg-dark-600 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-400 text-sm">No messages yet</p>
              <p className="text-gray-600 text-xs mt-1">Start a conversation from someone&apos;s profile!</p>
            </div>
          ) : (
            conversations.map((conv) => {
              const isOnline = onlineUsers.includes(conv.otherUser.id);
              const lastMsg = conv.lastMessage;
              const isAttachment = lastMsg?.content?.startsWith("[") || lastMsg?.fileUrl;
              let preview = lastMsg?.content || "";
              if (isAttachment && lastMsg?.fileType === "image") preview = "📷 Photo";
              else if (isAttachment && lastMsg?.fileType === "video") preview = "🎥 Video";
              else if (isAttachment && lastMsg?.fileType === "audio") preview = "🎵 Audio";
              else if (isAttachment) preview = "📎 Attachment";
              const isMine = lastMsg?.sender?.id === user?.id;

              return (
                <div
                  key={conv.otherUser.id}
                  onClick={() => router.push(`/messages/${conv.otherUser.id}`)}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-white/5 cursor-pointer transition-all active:bg-white/10"
                >
                  {/* Avatar with online dot */}
                  <div className="relative flex-shrink-0">
                    <div className="w-14 h-14 rounded-full overflow-hidden bg-dark-600">
                      {conv.otherUser.avatar ? (
                        <img src={conv.otherUser.avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-primary-600/30 flex items-center justify-center text-lg font-bold text-primary-400">
                          {conv.otherUser.name?.charAt(0)}
                        </div>
                      )}
                    </div>
                    {isOnline && (
                      <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-400 rounded-full border-2 border-dark-800" />
                    )}
                  </div>

                  {/* Name + preview */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{conv.otherUser.name}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {isMine && <span className="text-gray-500">You: </span>}
                      {preview}
                      {lastMsg && <span className="text-gray-600"> · {formatDate(lastMsg.createdAt)}</span>}
                    </p>
                  </div>

                  {/* Unread badge */}
                  {conv.unread > 0 && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Compose button */}
      <button
        onClick={() => router.push("/explore")}
        className="fixed bottom-24 right-6 md:hidden w-14 h-14 bg-primary-600 hover:bg-primary-700 rounded-full flex items-center justify-center shadow-lg shadow-primary-600/30 transition-all active:scale-95 z-40"
        title="New message"
      >
        <HiPencilSquare className="text-xl text-white" />
      </button>
    </div>
  );
}
