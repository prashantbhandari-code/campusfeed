"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import PostCard from "@/components/PostCard";
import StoryBar from "@/components/StoryBar";
import UserAvatar from "@/components/UserAvatar";
import Link from "next/link";

export default function FeedPage() {
  const { data: session } = useSession();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const user = session?.user as any;

  useEffect(() => {
    fetchPosts();
    fetchSuggestions();
  }, []);

  const fetchPosts = async () => {
    try {
      const res = await fetch("/api/posts");
      const data = await res.json();
      setPosts(data);
    } catch {} finally {
      setLoading(false);
    }
  };

  const fetchSuggestions = async () => {
    try {
      const res = await fetch("/api/users?q=");
      const data = await res.json();
      setSuggestions(data.slice(0, 5));
    } catch {}
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <StoryBar />

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass rounded-2xl p-4 animate-pulse">
              <div className="flex gap-3 mb-4">
                <div className="w-10 h-10 bg-dark-600 rounded-full" />
                <div className="flex-1">
                  <div className="h-4 bg-dark-600 rounded w-1/3 mb-2" />
                  <div className="h-3 bg-dark-600 rounded w-1/4" />
                </div>
              </div>
              <div className="h-4 bg-dark-600 rounded w-full mb-2" />
              <div className="h-4 bg-dark-600 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <div className="text-6xl mb-4">🏫</div>
          <p className="text-gray-300 text-lg font-medium mb-2">Welcome to Campus!</p>
          <p className="text-gray-500 text-sm mb-4">Follow your classmates or share your first post</p>
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
        </div>
      )}

      {/* Sidebar Suggestions - visible on larger screens */}
      <div className="hidden lg:block fixed right-8 top-20 w-80">
        <div className="glass rounded-2xl p-4">
          <h3 className="font-semibold text-gray-300 mb-4">Suggested for you</h3>
          {suggestions.map((s: any) => (
            <Link
              key={s.id}
              href={`/profile/${s.username}`}
              className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-all"
            >
              <UserAvatar user={s} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{s.name}</p>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-gray-500 truncate">@{s.username}</p>
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
  );
}
