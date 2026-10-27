"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import UserAvatar from "../ui/UserAvatar";
import { HiX } from "react-icons/hi";

interface FollowersModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  type: "followers" | "following";
  count: number;
}

export default function FollowersModal({ isOpen, onClose, userId, type, count }: FollowersModalProps) {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [restricted, setRestricted] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    fetchList();
  }, [isOpen, userId, type]);

  const fetchList = async () => {
    setLoading(true);
    setRestricted(false);
    try {
      const res = await fetch(`/api/users/${userId}/${type}`);
      if (res.status === 403) {
        setRestricted(true);
        return;
      }
      const data = await res.json();
      setUsers(data);
    } catch (error) { console.error("Operation failed:", error); } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white dark:bg-dark-800 rounded-2xl w-full max-w-md mx-4 max-h-[70vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-white/10">
          <h3 className="font-bold text-lg text-gray-900 dark:text-white">
            {type === "followers" ? "Followers" : "Following"}
          </h3>
          <span className="text-sm text-gray-500">{count}</span>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-900 dark:hover:text-white">
            <HiX className="text-xl" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-11 h-11 bg-gray-200 dark:bg-dark-600 rounded-full" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 dark:bg-dark-600 rounded w-1/3 mb-1" />
                    <div className="h-3 bg-gray-200 dark:bg-dark-600 rounded w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : restricted ? (
            <div className="p-8 text-center">
              <div className="text-4xl mb-3">🔒</div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                You can only see {type} of mutual connections
              </p>
              <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
                Follow each other to view this list
              </p>
            </div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-4xl mb-3">{type === "followers" ? "👤" : "👥"}</div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                No {type} yet
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-white/5">
              {users.map((user) => (
                <button
                  key={user.id}
                  onClick={() => {
                    onClose();
                    router.push(`/profile/${user.username}`);
                  }}
                  className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-left"
                >
                  <UserAvatar user={user} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white truncate">{user.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">@{user.username}</p>
                    {user.department && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full">
                        {user.department}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
