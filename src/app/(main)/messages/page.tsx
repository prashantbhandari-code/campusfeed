"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "@/lib/auth/session";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { useSocket } from "@/lib/hooks/useSocket";
import { useUnreadGroups } from "@/lib/notifications/useUnreadGroups";
import { groupEmoji } from "@/lib/chat/group-emoji";
import { subscribe, publish } from "@/lib/realtime/bus";
import { parseInboxDeepLink, type MessagesTab } from "@/lib/chat/messages-inbox";
import GroupChat from "@/components/chat/GroupChat";
import { HiArrowLeft } from "react-icons/hi";
import { HiPencilSquare, HiArrowsPointingOut, HiChevronRight } from "react-icons/hi2";
import { formatLastSeen } from "@/lib/hooks/heartbeat";

// The group whose chat is open INSIDE this inbox. Opening a group from Messages
// must not navigate away to the group page — the conversation stands on this
// page. `detailFetched` gates the chat pane until /api/groups/[id] has answered
// with membership and role (the list endpoint doesn't carry myRole, and a
// notification deep link carries only an id).
type OpenGroup = {
  id: string;
  name: string | null;
  avatar: string | null;
  department: string | null;
  isMember: boolean;
  myRole: string | null;
  detailFetched: boolean;
};

function openFromList(group: any): OpenGroup {
  return {
    id: group.id,
    name: group.name ?? null,
    avatar: group.avatar ?? null,
    department: group.department ?? null,
    isMember: !!group.isMember,
    myRole: null,
    detailFetched: false,
  };
}

export default function MessagesPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const user = session?.user;
  const { onlineUsers } = useSocket(user?.id);
  // Two sections: Chats (DMs) and Groups (group chats). Groups carries its own
  // unread total on the tab, so each section owns its own count.
  const [activeTab, setActiveTab] = useState<MessagesTab>(() =>
    typeof window === "undefined" ? "chats" : parseInboxDeepLink(window.location.search).tab
  );
  const [openGroup, setOpenGroup] = useState<OpenGroup | null>(() => {
    if (typeof window === "undefined") return null;
    const { group } = parseInboxDeepLink(window.location.search);
    // Deep link from a group-post notification: the inbox opens with this
    // group's chat already showing, no second navigation.
    return group
      ? { id: group, name: null, avatar: null, department: null, isMember: false, myRole: null, detailFetched: false }
      : null;
  });
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [myGroups, setMyGroups] = useState<any[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  // The groups list loads lazily on first open of its tab, then stays live.
  const groupsLoaded = useRef(false);
  // Cancels the in-flight conversations fetch when a newer one starts or when
  // the page unmounts — prevents out-of-order responses and abort noise.
  const fetchController = useRef<AbortController | null>(null);
  const [typingIds, setTypingIds] = useState<Set<string>>(new Set());
  const unreadGroups = useUnreadGroups(user?.id);

  useEffect(() => {
    fetchConversations();
    // Keep badges/previews live: re-fetch when new messages arrive (the poll
    // ticks the unread counter for every device) or the tab wakes from
    // background — otherwise this list went stale until a manual reload.
    const offMessage = subscribe("new-message", () => fetchConversations());
    const offBadge = subscribe("messages-unread", () => fetchConversations());
    // Live typing indicators straight off the realtime bus (works in both
    // WebSocket and polling modes) — no refetch needed, pure UI state.
    const offTyping = subscribe("user-typing", (data: { senderId: string }) => {
      if (!data?.senderId) return;
      setTypingIds((prev) => {
        if (prev.has(data.senderId)) return prev;
        const next = new Set(prev);
        next.add(data.senderId);
        return next;
      });
    });
    const offStopTyping = subscribe("user-stop-typing", (data: { senderId: string }) => {
      if (!data?.senderId) return;
      setTypingIds((prev) => {
        if (!prev.has(data.senderId)) return prev;
        const next = new Set(prev);
        next.delete(data.senderId);
        return next;
      });
    });
    const wake = () => {
      if (document.visibilityState !== "visible") return;
      fetchConversations();
      if (groupsLoaded.current) fetchMyGroups();
    };
    document.addEventListener("visibilitychange", wake);
    window.addEventListener("focus", wake);
    window.addEventListener("online", wake);
    return () => {
      offMessage();
      offBadge();
      offTyping();
      offStopTyping();
      document.removeEventListener("visibilitychange", wake);
      window.removeEventListener("focus", wake);
      window.removeEventListener("online", wake);
      fetchController.current?.abort();
    };
  }, []);

  // Lazy-load the groups section the first time it's opened.
  useEffect(() => {
    if (activeTab !== "groups" || groupsLoaded.current) return;
    groupsLoaded.current = true;
    fetchMyGroups();
  }, [activeTab]);

  // Resolve the open group's detail once (id -> membership + role). The chat
  // pane waits for this: non-members can't chat, and admins may delete others'
  // messages. A group that no longer exists closes the pane back to the list.
  const openGroupId = openGroup?.id ?? null;
  useEffect(() => {
    if (!openGroupId) return;
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/groups/${openGroupId}`);
        if (!res.ok) throw new Error("Group not found");
        const data = await res.json();
        if (!alive) return;
        setOpenGroup((prev) =>
          prev && prev.id === openGroupId
            ? {
                id: openGroupId,
                name: data.name ?? null,
                avatar: data.avatar ?? null,
                department: data.department ?? null,
                isMember: !!data.isMember,
                myRole: data.myRole ?? null,
                detailFetched: true,
              }
            : prev
        );
      } catch (error) {
        // Deleted or unreadable: fall back to the list instead of a dead pane.
        console.error("Group detail failed:", error);
        if (alive) setOpenGroup((prev) => (prev && prev.id === openGroupId ? null : prev));
      }
    })();
    return () => {
      alive = false;
    };
  }, [openGroupId]);

  const fetchConversations = async () => {
    // Supersede any in-flight request so a slow older response can never
    // overwrite a newer one.
    fetchController.current?.abort();
    const controller = new AbortController();
    fetchController.current = controller;
    try {
      const res = await fetch("/api/messages", { signal: controller.signal });
      const data = await res.json();
      // API errors return {error}, not an array — an unguarded payload would
      // crash conversations.map below instead of showing the empty state.
      setConversations(Array.isArray(data) ? data : []);
    } catch (error) {
      // Deliberate cancellation (superseded request or unmount) is not an error.
      if ((error as Error)?.name === "AbortError") return;
      console.error("Operation failed:", error);
    } finally {
      if (fetchController.current === controller) setLoading(false);
    }
  };

  // Same endpoint the discovery page uses, narrowed to what I've joined — this
  // is the inbox view, not the browse-everything view (that stays at /groups).
  const fetchMyGroups = async () => {
    setGroupsLoading(true);
    try {
      const res = await fetch("/api/groups");
      const data = await res.json();
      if (Array.isArray(data)) setMyGroups(data.filter((g: any) => g.isMember));
    } catch (error) {
      console.error("Groups fetch failed:", error);
    } finally {
      setGroupsLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-4 md:py-8">
      {/* Instagram-style card */}
      <div className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-200 dark:border-white/[0.08] overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.2)]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-white/[0.06]">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Messages</h2>
          <div className="flex items-center gap-3">
            <button className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors" title="Expand">
              <HiArrowsPointingOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sections: Chats (DMs) | Groups (group chats) */}
        <div className="flex border-b border-gray-100 dark:border-white/[0.06]">
          {([
            { id: "chats", label: "Chats" },
            { id: "groups", label: "Groups" },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
                activeTab === tab.id
                  ? "text-primary-600 dark:text-primary-400 border-b-2 border-primary-600 dark:border-primary-400"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              {tab.label}
              {tab.id === "groups" && unreadGroups > 0 && (
                <span className="min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadGroups > 99 ? "99+" : unreadGroups}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Section body — the chat pane scrolls itself, so the list's scroller
            only applies to the list. */}
        <div className={activeTab === "groups" && openGroup ? "" : "max-h-[60vh] overflow-y-auto"}>
          {activeTab === "chats" ? (
            loading ? (
              <div className="p-4 space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse flex items-center gap-3">
                    <div className="w-14 h-14 bg-gray-200 dark:bg-dark-600 rounded-full" />
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 dark:bg-dark-600 rounded w-1/3 mb-2" />
                      <div className="h-3 bg-gray-200 dark:bg-dark-600 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-gray-500 dark:text-gray-400 text-sm">No messages yet</p>
                <p className="text-gray-400 dark:text-gray-600 text-xs mt-1">Start a conversation from someone&apos;s profile!</p>
              </div>
            ) : (
              conversations.map((conv) => {
                const isOnline = onlineUsers.includes(conv.otherUser.id);
                const lastMsg = conv.lastMessage;
                const isAttachment = lastMsg?.content?.startsWith("[") || lastMsg?.fileUrl;
                let preview = lastMsg?.content || "";
                if (lastMsg?.deletedForEveryone) preview = "🚫 This message was deleted";
                else if (isAttachment && lastMsg?.fileType === "image") preview = "📷 Photo";
                else if (isAttachment && lastMsg?.fileType === "video") preview = "🎥 Video";
                else if (isAttachment && lastMsg?.fileType === "audio") preview = "🎵 Audio";
                else if (isAttachment) preview = "📎 Attachment";
                const isMine = lastMsg?.sender?.id === user?.id;
                // Use lastSeen from the API response (sender or receiver depending on who is the other user)
                const otherUserLastSeen = conv.otherUser.lastSeen;

                return (
                  <div
                    key={conv.otherUser.id}
                    onClick={() => router.push(`/messages/${conv.otherUser.id}`)}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 dark:hover:bg-white/[0.04] cursor-pointer transition-all active:bg-gray-100 dark:active:bg-white/[0.08]"
                  >
                    {/* Avatar with online dot */}
                    <div className="relative flex-shrink-0">
                      <div className="w-14 h-14 rounded-full overflow-hidden bg-gray-200 dark:bg-dark-600 ring-2 ring-gray-100 dark:ring-white/[0.06]">
                        {conv.otherUser.avatar ? (
                          <img src={conv.otherUser.avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-primary-100 dark:bg-primary-600/30 flex items-center justify-center text-lg font-bold text-primary-600 dark:text-primary-400">
                            {conv.otherUser.name?.charAt(0)}
                          </div>
                        )}
                      </div>
                      {isOnline ? (
                        <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-white dark:border-dark-800 shadow-sm" title="Active now" />
                      ) : (
                        <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-gray-400 rounded-full border-2 border-white dark:border-dark-800 shadow-sm" title={otherUserLastSeen ? formatLastSeen(otherUserLastSeen) : "Offline"} />
                      )}
                    </div>

                    {/* Name + preview (or live typing indicator) */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{conv.otherUser.name}</p>
                      {typingIds.has(conv.otherUser.id) ? (
                        <p className="text-xs text-primary-600 dark:text-primary-400 font-medium truncate flex items-center gap-1">
                          typing
                          <span className="inline-flex gap-0.5 items-end pb-0.5">
                            <span className="w-1 h-1 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                            <span className="w-1 h-1 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                            <span className="w-1 h-1 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                          </span>
                        </p>
                      ) : (
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate flex items-center gap-1">
                          {isMine && <span className="text-gray-400 dark:text-gray-500">You: </span>}
                          {preview}
                          {lastMsg && <span className="text-gray-400 dark:text-gray-600"> · {formatDate(lastMsg.createdAt)}</span>}
                          {!isOnline && otherUserLastSeen && (
                            <span className="text-gray-400 dark:text-gray-500">· {formatLastSeen(otherUserLastSeen)}</span>
                          )}
                        </p>
                      )}
                    </div>

                    {/* Unread count badge */}
                    {conv.unread > 0 && (
                      <div className="min-w-[20px] h-5 px-1.5 bg-primary-600 text-white text-[11px] font-semibold rounded-full flex items-center justify-center flex-shrink-0">
                        {conv.unread > 99 ? "99+" : conv.unread}
                      </div>
                    )}
                  </div>
                );
              })
            )
          ) : openGroup ? (
            // Chat shown in place: no navigation, the inbox stays the inbox.
            <div className="flex flex-col">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-white/[0.06]">
                <button
                  onClick={() => setOpenGroup(null)}
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                  title="Back to groups"
                >
                  <HiArrowLeft className="w-5 h-5" />
                </button>
                <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-200 dark:bg-dark-600 flex items-center justify-center text-lg flex-shrink-0">
                  {openGroup.avatar ? (
                    <img src={openGroup.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    groupEmoji(openGroup.department)
                  )}
                </div>
                <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                  {openGroup.name ?? "…"}
                </p>
              </div>
              {/* A list click already knows membership (the list only holds
                  groups I'm in), so the chat can render before the detail
                  round-trip lands; a deep link carries only an id and must
                  wait for it. */}
              {openGroup.detailFetched || openGroup.isMember ? (
                <GroupChat
                  key={openGroup.id}
                  groupId={openGroup.id}
                  isMember={openGroup.isMember}
                  isAdmin={openGroup.myRole === "admin"}
                  // Opening a group marks it read server-side; republish so the
                  // Groups badge (and the nav total) drops right here.
                  onRead={() => publish("groups-read")}
                />
              ) : (
                <p className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                  Loading chat…
                </p>
              )}
            </div>
          ) : groupsLoading && myGroups.length === 0 ? (
            <div className="p-4 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse flex items-center gap-3">
                  <div className="w-14 h-14 bg-gray-200 dark:bg-dark-600 rounded-full" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 dark:bg-dark-600 rounded w-1/3 mb-2" />
                    <div className="h-3 bg-gray-200 dark:bg-dark-600 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : myGroups.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-500 dark:text-gray-400 text-sm">No group chats yet</p>
              <Link href="/groups" className="inline-block mt-2 text-sm text-primary-600 dark:text-primary-400 font-medium hover:underline">
                Find groups to join →
              </Link>
            </div>
          ) : (
            <>
              {myGroups.map((group) => (
                <button
                  key={group.id}
                  type="button"
                  // Opens the conversation right here in the inbox — never
                  // routes to the group page. A real button so keyboard and
                  // screen-reader users can open a chat too.
                  onClick={() => setOpenGroup(openFromList(group))}
                  className="w-full text-left flex items-center gap-3 px-5 py-3 hover:bg-gray-50 dark:hover:bg-white/[0.04] cursor-pointer transition-all active:bg-gray-100 dark:active:bg-white/[0.08]"
                >
                  <div className="w-14 h-14 rounded-full overflow-hidden bg-gray-200 dark:bg-dark-600 ring-2 ring-gray-100 dark:ring-white/[0.06] flex items-center justify-center text-2xl flex-shrink-0">
                    {group.avatar ? (
                      <img src={group.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      groupEmoji(group.department)
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{group.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {group.memberCount} members · {group.postCount} posts
                    </p>
                  </div>
                  <HiChevronRight className="text-gray-300 dark:text-gray-600 flex-shrink-0" />
                </button>
              ))}
              {/* Discovery/creation stays on the dedicated page — this tab is
                  only the chats you're already part of. */}
              <div className="px-5 py-3 border-t border-gray-100 dark:border-white/[0.06] text-center">
                <Link href="/groups" className="text-sm text-primary-600 dark:text-primary-400 font-medium hover:underline">
                  Find more groups →
                </Link>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Compose button — DMs only; group posts happen inside a group. */}
      {activeTab === "chats" && (
        <button
          onClick={() => router.push("/explore")}
          className="fixed bottom-24 right-6 md:hidden w-14 h-14 bg-primary-600 hover:bg-primary-700 rounded-full flex items-center justify-center shadow-[0_4px_16px_rgba(37,99,235,0.4)] transition-all active:scale-95 z-40"
          title="New message"
        >
          <HiPencilSquare className="text-xl text-white" />
        </button>
      )}
    </div>
  );
}
