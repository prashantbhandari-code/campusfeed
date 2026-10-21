"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "@/lib/session";
import PostCard from "@/components/PostCard";
import { StaggeredList, StaggeredItem } from "@/components/PageTransition";
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
  // Post to spotlight when arriving from a notification deep link. Seeded
  // straight from the URL so it survives a remount (the layout can mount this
  // page more than once while the session resolves).
  const [highlightId, setHighlightId] = useState<string | null>(() =>
    typeof window === "undefined"
      ? null
      : new URLSearchParams(window.location.search).get("post")
  );
  const user = session?.user;
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    // Deep link from a notification: /feed?post=<id> opens the feed scrolled to
    // that post. There is no post-detail page, so this is where like/comment
    // alerts land.
    const target = new URLSearchParams(window.location.search).get("post");
    (async () => {
      const firstPage = await fetchPosts(1, controller.signal);
      if (target) await jumpToPost(target, firstPage);
    })();
    fetchSuggestions(controller.signal);
    return () => controller.abort();
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

  const fetchPosts = async (pageNum: number, signal?: AbortSignal): Promise<any[]> => {
    try {
      const res = await fetch(`/api/posts?page=${pageNum}`);
      const data = await res.json();
      // API errors return {error}, not an array — don't let that crash the feed
      if (!Array.isArray(data)) { setHasMore(false); return []; }
      if (pageNum === 1) {
        setPosts(data);
      } else {
        setPosts((prev) => [...prev, ...data]);
      }
      setHasMore(data.length === 10); // If less than 10, no more posts
      return data;
    } catch (error) { console.error("Operation failed:", error); return []; } finally {
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

  // The feed pages 10 at a time and notifications only reference recent posts,
  // so walking forward a few pages finds the target in practice. Bounded so a
  // deep link can never crawl the entire feed.
  const jumpToPost = async (target: string, firstPage: any[]) => {
    setHighlightId(target);
    const extra: any[] = [];
    let found = firstPage.some((p) => p.id === target);
    for (let pageNum = 2; !found && pageNum <= 5 && extra.length < 40; pageNum++) {
      try {
        const res = await fetch(`/api/posts?page=${pageNum}`);
        const data = await res.json();
        if (!Array.isArray(data) || data.length === 0) break;
        const fresh = data.filter(
          (p: any) => !firstPage.some((x) => x.id === p.id) && !extra.some((x) => x.id === p.id)
        );
        extra.push(...fresh);
        found = extra.some((p) => p.id === target);
        if (data.length < 10) break; // last page reached
      } catch {
        break;
      }
    }
    if (extra.length) setPosts((prev) => [...prev, ...extra]);
    // Let the appended rows paint, then bring the post into view.
    setTimeout(() => {
      document.getElementById(`post-${target}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 300);
    // Hold the ring until the reader does something. A fixed timer can expire
    // while the page is still settling, so interaction (or a long stop-gap)
    // ends it instead.
    const clearHighlight = () => {
      setHighlightId(null);
      window.removeEventListener("pointerdown", clearHighlight);
      window.removeEventListener("keydown", clearHighlight);
      window.removeEventListener("touchstart", clearHighlight);
      window.removeEventListener("wheel", clearHighlight);
    };
    window.addEventListener("pointerdown", clearHighlight, { once: true });
    window.addEventListener("keydown", clearHighlight, { once: true });
    window.addEventListener("touchstart", clearHighlight, { once: true });
    window.addEventListener("wheel", clearHighlight, { once: true });
    setTimeout(clearHighlight, 30000);
  };

  // Pull to refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    setPage(1);
    setHasMore(true);
    await fetchPosts(1);
    setRefreshing(false);
  };

  const fetchSuggestions = async (signal?: AbortSignal) => {
    try {
      const res = await fetch("/api/users?q=");
      const data = await res.json();
      // The endpoint may return an error object when unauthenticated or when the
      // database is unavailable — never treat that as a list.
      setSuggestions(Array.isArray(data) ? data.slice(0, 5) : []);
    } catch (error) { console.error("Operation failed:", error); }
  };

  return (
    <div className="flex gap-8 max-w-6xl mx-auto px-4 py-6">
      {/* Main Feed */}
      <div className="flex-1 max-w-2xl">
        <h1 className="sr-only">Campusfeed Feed</h1>
        <StoryBar />

        <div className="border-b border-gray-200 dark:border-white/5 mb-2" />

        {/* Pull to refresh indicator */}
        {refreshing && (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary-500 border-t-transparent" />
          </div>
        )}

        {/* Refresh button (mobile) */}
        <button
          onClick={handleRefresh}
          className="md:hidden w-full text-center py-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-1"
        >
          {refreshing ? "Refreshing..." : "Pull to refresh"}
        </button>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass-card rounded-2xl p-4 animate-pulse">
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
          <div className="glass-card rounded-2xl p-12 text-center">
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
          <StaggeredList>
            {posts.map((post) => (
              <StaggeredItem key={post.id}>
                <div
                  id={`post-${post.id}`}
                  className={`rounded-2xl transition-all ${
                    highlightId === post.id
                      ? "ring-2 ring-primary-500 ring-offset-2 ring-offset-gray-50 dark:ring-offset-dark-900"
                      : ""
                  }`}
                >
                  <PostCard post={post} onDelete={() => setPosts(posts.filter((p) => p.id !== post.id))} />
                </div>
              </StaggeredItem>
            ))}
            {/* Load more trigger */}
            <div ref={loadMoreRef} className="py-4">
              {loadingMore && (
                <div className="flex justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary-500 border-t-transparent" />
                </div>
              )}
              {!hasMore && posts.length > 0 && (
                <div className="text-center py-6">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-white/5 rounded-full">
                    <span className="text-gray-400 dark:text-gray-500 text-sm">No more posts</span>
                  </div>
                  <button onClick={() => document.querySelector("main")?.scrollTo({ top: 0, behavior: "smooth" })} className="block mx-auto mt-3 px-4 py-2 rounded-full text-xs text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 transition-colors">
                    ↑ Back to top
                  </button>
                </div>
              )}
            </div>
          </StaggeredList>
        )}
      </div>

      {/* Sidebar Suggestions */}
      <div className="hidden lg:block w-80 flex-shrink-0">
        <div className="sticky top-20">
          <div className="glass-card rounded-2xl p-4 shadow-sm dark:shadow-none">
            <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-4">Suggested for you</h3>
            <div className="space-y-3">
              {suggestions.map((s: any) => (
                <div key={s.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-all">
                  <Link href={`/profile/${s.username}`} className="flex items-center gap-3 flex-1 min-w-0">
                    <UserAvatar user={s} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate capitalize">{s.name}</p>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-gray-400 dark:text-gray-500 truncate">@{s.username}</p>
                        {s.department && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-campus-600/20 text-campus-400 rounded-full">{s.department}</span>
                        )}
                      </div>
                    </div>
                  </Link>
                  <button className="px-3 py-1.5 text-xs font-semibold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-500/10 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-500/20 transition-colors whitespace-nowrap">
                    Follow
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
