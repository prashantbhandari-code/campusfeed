"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { HiOutlineArrowLeft, HiOutlineBookmark } from "react-icons/hi";
import toast from "react-hot-toast";
import PostCard from "@/components/PostCard";

export default function SavedPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/posts?saved=1");
        const data = res.ok ? await res.json() : [];
        if (!cancelled) setPosts(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) toast.error("Could not load saved posts");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-all">
          <HiOutlineArrowLeft className="text-xl text-gray-600 dark:text-gray-400" />
        </button>
        <HiOutlineBookmark className="text-xl text-gray-900 dark:text-white" />
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Saved</h1>
      </div>

      {loading ? (
        <div className="text-center py-16 bg-white dark:bg-dark-800 rounded-2xl border border-gray-200 dark:border-white/[0.08]">
          <p className="text-gray-400 dark:text-gray-500 animate-pulse">Loading your saved posts…</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-dark-800 rounded-2xl border border-gray-200 dark:border-white/[0.08]">
          <HiOutlineBookmark className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <p className="text-gray-500 dark:text-gray-400 text-lg">Nothing saved yet</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
            Tap the bookmark icon on any post to keep it here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onDelete={() => setPosts((prev) => prev.filter((p) => p.id !== post.id))}
            />
          ))}
        </div>
      )}
    </div>
  );
}
