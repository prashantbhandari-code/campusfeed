"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import UserAvatar from "@/components/UserAvatar";
import { formatDate } from "@/lib/utils";
import { useSocket } from "@/lib/useSocket";

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
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Messages</h1>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass rounded-xl p-4 animate-pulse flex items-center gap-3">
              <div className="w-12 h-12 bg-dark-600 rounded-full" />
              <div className="flex-1">
                <div className="h-4 bg-dark-600 rounded w-1/3 mb-2" />
                <div className="h-3 bg-dark-600 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : conversations.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <div className="text-6xl mb-4">💬</div>
          <p className="text-gray-300 text-lg font-medium mb-2">No messages yet</p>
          <p className="text-gray-500 text-sm">Start a conversation from someone&apos;s profile!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {conversations.map((conv) => (
            <div
              key={conv.otherUser.id}
              onClick={() => router.push(`/messages/${conv.otherUser.id}`)}
              className="glass rounded-xl p-4 flex items-center gap-3 hover:bg-white/5 cursor-pointer transition-all active:scale-[0.98]"
            >
              <UserAvatar user={conv.otherUser} size="lg" isOnline={onlineUsers.includes(conv.otherUser.id)} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-semibold truncate">{conv.otherUser.name}</p>
                  <p className="text-xs text-gray-500 flex-shrink-0">
                    {formatDate(conv.lastMessage.createdAt)}
                  </p>
                </div>
                <p className="text-sm text-gray-400 truncate">{conv.lastMessage.content}</p>
              </div>
              {conv.unread > 0 && (
                <span className="bg-primary-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {conv.unread}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
