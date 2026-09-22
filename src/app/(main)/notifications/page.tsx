"use client";

import { useState, useEffect } from "react";
import UserAvatar from "@/components/UserAvatar";
import { formatDate } from "@/lib/utils";
import { HiHeart, HiChat, HiUserAdd, HiMail } from "react-icons/hi";
import toast from "react-hot-toast";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
    markAllRead();
  }, []);

  
  // Group consecutive notifications from same user of same type
  const deduplicateNotifications = (notifs: any[]) => {
    const grouped: any[] = [];
    let i = 0;
    while (i < notifs.length) {
      const current = notifs[i];
      let count = 1;
      // Look ahead for consecutive same-user, same-type notifications
      while (
        i + count < notifs.length &&
        notifs[i + count].fromUserId === current.fromUserId &&
        notifs[i + count].type === current.type
      ) {
        count++;
      }
      if (count > 1) {
        grouped.push({ ...current, count });
      } else {
        grouped.push(current);
      }
      i += count;
    }
    return grouped;
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      const data = await res.json();
      setNotifications(data);
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
      case "message": return <HiMail className="text-purple-500" />;
      default: return null;
    }
  };

  const getMessage = (notif: any) => {
    switch (notif.type) {
      case "like": return "liked your post";
      case "comment": return "commented on your post";
      case "follow": return "started following you";
      case "message": return notif.count && notif.count > 1 ? `sent you ${notif.count} messages` : "sent you a message";
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
          {deduplicateNotifications(notifications).map((notif) => (
            <div
              key={notif.id}
              className={`glass-card rounded-xl p-4 flex items-center gap-3 transition-all hover:bg-gray-50 dark:hover:bg-white/[0.03] ${
                !notif.read ? "border-l-2 border-primary-500 bg-primary-50/50 dark:bg-primary-500/5" : ""
              }`}
            >
              <UserAvatar user={notif.fromUser} size="md" />
              <div className="flex-1 min-w-0">
                <p className="text-sm">
                  <span className="font-semibold">{notif.fromUser.name}</span>{" "}
                  <span className="text-gray-400">{getMessage(notif)}</span>
                </p>
                <p className="text-xs text-gray-500 mt-1">{formatDate(notif.createdAt)}</p>
              </div>
              <div className="text-lg">{getIcon(notif.type)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
