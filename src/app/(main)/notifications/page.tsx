"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import UserAvatar from "@/components/UserAvatar";
import { formatDate } from "@/lib/utils";
import { notificationTarget } from "@/lib/notification-target";
import { groupNotifications } from "@/lib/group-notifications";
import { HiHeart, HiChat, HiUserAdd, HiOutlineUserGroup, HiOutlineDocumentText, HiChevronRight } from "react-icons/hi";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
    markAllRead();
  }, []);

  
  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      const data = await res.json();
      // API errors return {error}, not an array — an unguarded payload would
      // render a blank page instead of the empty state.
      setNotifications(Array.isArray(data) ? data : []);
    } catch (error) { console.error("Operation failed:", error); } finally {
      setLoading(false);
    }
  };

  const markAllRead = async () => {
    try {
      await fetch("/api/notifications", { method: "PUT" });
    } catch (error) { console.error("Operation failed:", error); }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "like": return <HiHeart className="text-red-500" />;
      case "comment": return <HiChat className="text-blue-500" />;
      case "follow": return <HiUserAdd className="text-green-500" />;
      case "group_post": return <HiOutlineUserGroup className="text-campus-400" />;
      case "blog_comment": return <HiOutlineDocumentText className="text-pink-400" />;
      default: return null;
    }
  };

  const getMessage = (notif: any) => {
    switch (notif.type) {
      case "like": return "liked your post";
      case "comment": return "commented on your post";
      case "follow": return "started following you";
      case "group_post": return "posted in your group";
      case "blog_comment": return "commented on your blog";
      default: return "interacted with you";
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Notifications</h1>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card rounded-xl p-4 animate-pulse flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-200 dark:bg-dark-600 rounded-full" />
              <div className="flex-1">
                <div className="h-4 bg-gray-200 dark:bg-dark-600 rounded w-2/3 mb-2" />
                <div className="h-3 bg-gray-200 dark:bg-dark-600 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center">
          <div className="text-6xl mb-4">🔔</div>
          <p className="text-gray-900 dark:text-gray-300 text-lg font-medium mb-2">All caught up!</p>
          <p className="text-gray-500 dark:text-gray-400 text-sm">You&apos;ll see notifications when people interact with you</p>
        </div>
      ) : (
        <div className="space-y-2">
          {groupNotifications(notifications).map((notif) => {
            const target = notificationTarget(notif);
            const rowClass = `glass-card rounded-xl p-4 flex items-center gap-3 transition-all hover:bg-gray-50 dark:hover:bg-white/[0.03] ${
              !notif.read ? "border-l-2 border-primary-500 bg-primary-50/50 dark:bg-primary-500/5" : ""
            } ${target ? "cursor-pointer active:bg-gray-100 dark:active:bg-white/[0.06]" : ""}`;
            const body = (
              <>
                <UserAvatar user={notif.fromUser} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-semibold">{notif.fromUser.name}</span>{" "}
                    <span className="text-gray-400">{getMessage(notif)}</span>
                    {notif.count > 1 && (
                      <span className="text-gray-400 dark:text-gray-500"> · {notif.count}×</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{formatDate(notif.createdAt)}</p>
                </div>
                <div className="text-lg">{getIcon(notif.type)}</div>
                {target && <HiChevronRight className="text-gray-300 dark:text-gray-600 flex-shrink-0" />}
              </>
            );
            // A row with a target opens it; one without (legacy or unknown
            // type) stays inert rather than linking somewhere wrong.
            return target ? (
              <Link key={notif.id} href={target} className={rowClass}>
                {body}
              </Link>
            ) : (
              <div key={notif.id} className={rowClass}>
                {body}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
