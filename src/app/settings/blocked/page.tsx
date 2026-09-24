"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { HiOutlineArrowLeft, HiOutlineBan } from "react-icons/hi";
import toast from "react-hot-toast";
import UserAvatar from "@/components/UserAvatar";

interface BlockedUser {
  id: string;
  name: string;
  username: string;
  avatar?: string | null;
}

export default function BlockedAccountsPage() {
  const router = useRouter();
  const [users, setUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [unblocking, setUnblocking] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/blocked");
      const data = res.ok ? await res.json() : [];
      setUsers(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Could not load blocked accounts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const unblock = async (id: string) => {
    setUnblocking(id);
    try {
      const res = await fetch(`/api/users/${id}/block`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setUsers((prev) => prev.filter((u) => u.id !== id));
      toast.success("Account unblocked");
    } catch {
      toast.error("Failed to unblock account");
    } finally {
      setUnblocking(null);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-all">
          <HiOutlineArrowLeft className="text-xl text-gray-600 dark:text-gray-400" />
        </button>
        <HiOutlineBan className="text-xl text-gray-900 dark:text-white" />
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Blocked Accounts</h1>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 px-1 mb-4">
        Accounts you block can&apos;t interact with you here. You can unblock anyone at any time.
      </p>

      {loading ? (
        <div className="text-center py-16 bg-white dark:bg-dark-800 rounded-2xl border border-gray-200 dark:border-white/[0.08]">
          <p className="text-gray-400 dark:text-gray-500 animate-pulse">Loading…</p>
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-dark-800 rounded-2xl border border-gray-200 dark:border-white/[0.08]">
          <HiOutlineBan className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <p className="text-gray-500 dark:text-gray-400 text-lg">No blocked accounts</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
            People you block will show up here.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-200 dark:border-white/[0.08] divide-y divide-gray-100 dark:divide-white/[0.04]">
          {users.map((user) => (
            <div key={user.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <UserAvatar user={user} size="md" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{user.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">@{user.username}</p>
                </div>
              </div>
              <button
                onClick={() => unblock(user.id)}
                disabled={unblocking === user.id}
                className="shrink-0 px-3.5 py-1.5 text-xs font-semibold rounded-full bg-gray-100 dark:bg-white/[0.08] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/[0.14] transition-all disabled:opacity-50"
              >
                {unblocking === user.id ? "Unblocking…" : "Unblock"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
