"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import PostCard from "@/components/PostCard";
import StoryBar from "@/components/StoryBar";
import UserAvatar from "@/components/UserAvatar";
import Link from "next/link";

export default function FeedPage() {
  const { data: session } = useSession();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const user = session?.user as any;
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchPosts(1);
    fetchSuggestions();
  }, []);

  // Infinite scroll observer
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => observerRef.current?.disconnect();
  }, [hasMore, loadingMore, page]);

  const fetchPosts = async (pageNum: number) => {
    try {
      const res = await fetch(`/api/posts?page=${pageNum}`);
      const data = await res.json();
      if (pageNum === 1) {
        setPosts(data);
      } else {
        setPosts((prev) => [...prev, ...data]);
      }
      setHasMore(data.length === 10); // If less than 10, no more posts
    } catch {} finally {
      setLoading(false);
    }
  };

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    await fetchPosts(nextPage);
    setPage(nextPage);
    setLoadingMore(false);
  }, [page, loadingMore, hasMore]);

  // Pull to refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    setPage(1);
    setHasMore(true);
    await fetchPosts(1);
    setRefreshing(false);
  };

  const fetchSuggestions = async () => {
    try {
      const res = await fetch("/api/users?q=");
      const data = await res.json();
      setSuggestions(data.slice(0, 5));
    } catch {}
  };

  return (      <div className="flex gap-8 max-w-6xl mx-auto px-4 py-6">
      {/* Main Feed */}
      <div className="flex-1 max-w-2xl">
        <StoryBar />

        <div className="border-b border-gray-200 dark:border-white/5 mb-4" />

        {/* Pull to refresh indicator */}
        {refreshing && (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary-500 border-t-transparent" />
          </div>
        )}

        {/* Refresh button (mobile) */}
        <button
          onClick={handleRefresh}
          className="md:hidden w-full text-center py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-2"
        >
          {refreshing ? "Refreshing..." : "Pull to refresh"}
        </button>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-white/[0.08] rounded-2xl p-4 animate-pulse">
                <div className="flex gap-3 mb-4">
                  <div className="w-10 h-10 bg-gray-200 dark:bg-dark-600 rounded-full" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 dark:bg-dark-600 rounded w-1/3 mb-2" />
                    <div className="h-3 bg-gray-200 dark:bg-dark-600 rounded w-1/4" />
                  </div>
                </div>
                <div className="h-4 bg-gray-200 dark:bg-dark-600 rounded w-full mb-2" />
                <div className="h-4 bg-gray-200 dark:bg-dark-600 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-white/[0.08] rounded-2xl p-12 text-center">
            <div className="text-6xl mb-4">🏫</div>
            <p className="text-gray-600 dark:text-gray-300 text-lg font-medium mb-2">Welcome to Campus!</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mb-4">Follow your classmates or share your first post</p>
            <div className="flex justify-center gap-2">
              <span className="text-2xl">📸</span>
              <span className="text-2xl">💬</span>
              <span className="text-2xl">🎉</span>
            </div>
          </div>
        ) : (
          <div className="space-y-0">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} onDelete={() => setPosts(posts.filter((p) => p.id !== post.id))} />
            ))}
            {/* Load more trigger */}
            <div ref={loadMoreRef} className="py-4">
              {loadingMore && (
                <div className="flex justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary-500 border-t-transparent" />
                </div>
              )}
              {!hasMore && posts.length > 0 && (
                <p className="text-center text-gray-400 dark:text-gray-500 text-sm">No more posts</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Sidebar Suggestions */}
      <div className="hidden lg:block w-80 flex-shrink-0">
        <div className="sticky top-20">
          <div className="bg-white dark:bg-dark-900 border border-gray-200 dark:border-white/5 rounded-2xl p-4 shadow-sm dark:shadow-none">
            <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-4">Suggested for you</h3>
            {suggestions.map((s: any) => (
              <Link
                key={s.id}
                href={`/profile/${s.username}`}
                className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-all"
              >
                <UserAvatar user={s} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{s.name}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-gray-400 dark:text-gray-500 truncate">@{s.username}</p>
                    {s.department && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-campus-600/20 text-campus-400 rounded-full">{s.department}</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
