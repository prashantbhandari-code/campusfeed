"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import UserAvatar from "@/components/UserAvatar";
import { HiSearch, HiHeart } from "react-icons/hi";
import { parseImages } from "@/lib/utils";
import { useSocket } from "@/lib/useSocket";

export default function ExplorePage() {
  const router = useRouter();
  const { onlineUsers } = useSocket();
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"people" | "posts">("people");

  useEffect(() => {
    searchUsers();
    fetchPosts();
  }, []);

  const searchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/users?q=${query}`);
      const data = await res.json();
      setUsers(data);
    } catch {} finally {
      setLoading(false);
    }
  };

  const fetchPosts = async () => {
    try {
      const res = await fetch("/api/posts");
      const data = await res.json();
      setPosts(data);
    } catch {}
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchUsers();
  };

  return (
    <div className="max-w-2xl mx-auto px-0 md:px-4 py-6">
      <h1 className="text-2xl font-bold mb-4 px-4">Explore</h1>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="mb-4 px-4">
        <div className="relative">
          <HiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people..."
            className="w-full pl-12 pr-4 py-3 bg-dark-700 border border-dark-500 rounded-xl focus:outline-none focus:border-primary-500 transition-colors"
          />
        </div>
      </form>

      {/* Tabs */}
      <div className="flex border-b border-white/10 mb-4 px-4">
        <button
          onClick={() => setActiveTab("people")}
          className={`flex-1 py-3 text-sm font-semibold transition-all ${
            activeTab === "people" ? "text-white border-b-2 border-white" : "text-gray-500"
          }`}
        >
          👥 People
        </button>
        <button
          onClick={() => setActiveTab("posts")}
          className={`flex-1 py-3 text-sm font-semibold transition-all ${
            activeTab === "posts" ? "text-white border-b-2 border-white" : "text-gray-500"
          }`}
        >
          📸 Posts
        </button>
      </div>

      {/* Content */}
      {activeTab === "people" ? (
        loading ? (
          <div className="space-y-3 px-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass rounded-xl p-4 animate-pulse flex items-center gap-3">
                <div className="w-12 h-12 bg-dark-600 rounded-full" />
                <div className="flex-1">
                  <div className="h-4 bg-dark-600 rounded w-1/3 mb-2" />
                  <div className="h-3 bg-dark-600 rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-5xl mb-4">🔍</div>
            <p className="text-gray-400">No users found</p>
          </div>
        ) : (
          <div className="space-y-2 px-4">
            {users.map((u) => (
              <div
                key={u.id}
                onClick={() => router.push(`/profile/${u.username}`)}
                className="glass rounded-xl p-4 flex items-center gap-3 hover:bg-white/5 cursor-pointer transition-all"
              >
                <UserAvatar user={u} size="lg" isOnline={onlineUsers.includes(u.id)} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{u.name}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-gray-500">@{u.username}</p>
                    {u.department && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-campus-600/20 text-campus-400 rounded-full">{u.department}</span>
                    )}
                    {u.batchYear && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-purple-600/20 text-purple-400 rounded-full">'{String(u.batchYear).slice(-2)}</span>
                    )}
                  </div>
                  {u.bio && <p className="text-sm text-gray-400 mt-1 truncate">{u.bio}</p>}
                </div>
                <div className="text-right text-xs text-gray-500 flex-shrink-0">
                  <p>{u._count?.followers || 0} {u._count?.followers === 1 ? "follower" : "followers"}</p>
                  <p>{u._count?.posts || 0} {u._count?.posts === 1 ? "post" : "posts"}</p>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* Posts Grid — Masonry style */
        posts.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-5xl mb-4">📸</div>
            <p className="text-gray-400">No posts to explore yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-0.5">
            {posts.map((post) => {
              const postImages = parseImages(post.images);
              const firstImage = postImages[0];
              // Make some posts span 2 rows for visual variety
              const isLarge = postImages.length > 1;
              return (
                <div
                  key={post.id}
                  className={`relative bg-dark-800 cursor-pointer group ${
                    isLarge ? "row-span-2" : ""
                  }`}
                  onClick={() => router.push(`/feed`)}
                >
                  {firstImage ? (
                    <img
                      src={firstImage}
                      alt=""
                      className={`w-full object-cover ${isLarge ? "aspect-[1/2]" : "aspect-square"}`}
                    />
                  ) : (
                    <div className={`w-full flex items-center justify-center p-3 ${isLarge ? "aspect-[1/2]" : "aspect-square"}`}>
                      <p className="text-xs text-gray-500 text-center line-clamp-4">{post.content}</p>
                    </div>
                  )}
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                    <span className="text-white text-sm font-semibold flex items-center gap-1">
                      <HiHeart className="text-white" /> {post.likesCount || 0}
                    </span>
                    <span className="text-white text-sm font-semibold flex items-center gap-1">
                      💬 {post.commentsCount || 0}
                    </span>
                  </div>
                  {/* Multi-image indicator */}
                  {postImages.length > 1 && (
                    <div className="absolute top-2 right-2">
                      <span className="text-white text-xs drop-shadow">🔲</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
