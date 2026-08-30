"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import UserAvatar from "@/components/UserAvatar";
import {
  HiArrowLeft,
  HiOutlineUsers,
  HiOutlineCheck,
  HiOutlinePhotograph,
  HiX,
} from "react-icons/hi";

interface GroupDetail {
  id: string;
  name: string;
  description: string | null;
  avatar: string | null;
  coverPhoto: string | null;
  type: string;
  department: string | null;
  batchYear: number | null;
  memberCount: number;
  postCount: number;
  isMember: boolean;
  createdBy: { id: string; name: string; username: string; avatar: string | null };
  members: {
    id: string;
    role: string;
    user: { id: string; name: string; username: string; avatar: string | null; department: string | null };
  }[];
}

interface GroupPost {
  id: string;
  content: string | null;
  images: string;
  createdAt: string;
  author: { id: string; name: string; username: string; avatar: string | null; department: string | null };
}

const GROUP_EMOJIS: Record<string, string> = {
  CSE: "💻", IT: "🌐", ECE: "⚡", EEE: "🔌", Mechanical: "⚙️", Civil: "🏗️",
  "CSE (Data Science)": "📊", "CSE (AI & ML)": "🤖", "CSE (Cyber Security)": "🔐",
  Biotechnology: "🧬", Chemical: "🧪", Aerospace: "✈️", Automobile: "🚗",
  Mechatronics: "🔧", Architecture: "🏛️", Law: "⚖️", Management: "📈",
  "Media & Communication": "📺", Design: "🎨", Electrical: "⚡",
};

function parseImages(imgs: string): string[] {
  try { return JSON.parse(imgs); } catch { return []; }
}

function timeAgo(date: string) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

export default function GroupDetailPage() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const params = useParams();
  const router = useRouter();
  const groupId = params.id as string;

  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [posts, setPosts] = useState<GroupPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"posts" | "members">("posts");
  const [newPost, setNewPost] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    fetchGroup();
    fetchPosts();
  }, [groupId]);

  const fetchGroup = async () => {
    try {
      const res = await fetch(`/api/groups/${groupId}`);
      if (!res.ok) throw new Error();
      setGroup(await res.json());
    } catch {
      toast.error("Group not found");
      router.push("/groups");
    } finally {
      setLoading(false);
    }
  };

  const fetchPosts = async () => {
    try {
      const res = await fetch(`/api/groups/${groupId}/posts`);
      if (res.ok) setPosts(await res.json());
    } catch {}
  };

  const handleJoin = async () => {
    try {
      await fetch(`/api/groups/${groupId}/join`, { method: "POST" });
      fetchGroup();
      fetchPosts();
      toast.success("Joined group!");
    } catch {
      toast.error("Failed to join");
    }
  };

  const handleLeave = async () => {
    try {
      await fetch(`/api/groups/${groupId}/join`, { method: "DELETE" });
      fetchGroup();
      toast.success("Left group");
    } catch {
      toast.error("Failed to leave");
    }
  };

  const handlePost = async () => {
    if (!newPost.trim()) return;
    setPosting(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newPost }),
      });
      if (!res.ok) throw new Error();
      const post = await res.json();
      setPosts([post, ...posts]);
      setNewPost("");
      toast.success("Posted!");
    } catch {
      toast.error("Failed to post");
    } finally {
      setPosting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (!group) return null;

  const emoji = GROUP_EMOJIS[group.department || ""] || "👥";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-900 pb-20 md:pb-0">
      {/* Header */}
      <div className="sticky top-16 z-10 bg-white/95 dark:bg-dark-900/95 backdrop-blur-sm border-b border-white/5">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1">
            <HiArrowLeft className="text-xl" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold truncate">{group.name}</h1>
            <p className="text-xs text-gray-400">
              {group.memberCount} members · {group.postCount} posts
            </p>
          </div>
          <button
            onClick={group.isMember ? handleLeave : handleJoin}
            className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-all ${
              group.isMember
                ? "bg-gray-100 dark:bg-dark-700 text-gray-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-600/20 hover:text-red-500 dark:hover:text-red-400"
                : "bg-primary-600 hover:bg-primary-700 text-white"
            }`}
          >
            {group.isMember ? "Leave" : "Join"}
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        {/* Cover */}
        <div className="h-32 bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center">
          <span className="text-6xl">{emoji}</span>
        </div>

        {/* Info */}
        <div className="px-4 py-3 border-b border-white/5">
          <h2 className="text-lg font-bold">{group.name}</h2>
          {group.description && (
            <p className="text-sm text-gray-400 mt-1">{group.description}</p>
          )}
          <div className="flex gap-2 mt-2">
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary-600/20 text-primary-300">
              {group.type}
            </span>
            {group.department && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-600/20 text-blue-300">
                {group.department}
              </span>
            )}
            {group.batchYear && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-600/20 text-purple-300">
                Batch {group.batchYear}
              </span>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/5">
          {(["posts", "members"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-sm font-medium capitalize transition-colors ${
                activeTab === tab
                  ? "text-primary-400 border-b-2 border-primary-400"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === "posts" ? (
          <div className="px-4 py-4 space-y-4">
            {/* Create Post */}
            {group.isMember && (
              <div className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-white/[0.08] rounded-2xl p-4">
                <div className="flex gap-3">
                  <UserAvatar user={user} size="sm" />
                  <div className="flex-1">
                    <textarea
                      value={newPost}
                      onChange={(e) => setNewPost(e.target.value)}
                      placeholder={`Post in ${group.name}...`}
                      className="w-full bg-gray-100 dark:bg-dark-700 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary-500 min-h-[60px]"
                      rows={2}
                    />
                    <div className="flex justify-end mt-2">
                      <button
                        onClick={handlePost}
                        disabled={posting || !newPost.trim()}
                        className="px-4 py-1.5 bg-primary-600 hover:bg-primary-700 rounded-xl text-sm font-medium disabled:opacity-50"
                      >
                        {posting ? "Posting..." : "Post"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Posts */}
            {posts.length === 0 ? (
              <div className="text-center py-12">
                <span className="text-5xl mb-3 block">📝</span>
                <p className="text-gray-400">No posts yet. Be the first!</p>
              </div>
            ) : (
              posts.map((post) => (
                <div key={post.id} className="glass rounded-2xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <UserAvatar user={post.author} size="sm" />
                    <div>
                      <p className="text-sm font-semibold">{post.author.name}</p>
                      <p className="text-xs text-gray-400">
                        @{post.author.username} · {timeAgo(post.createdAt)}
                      </p>
                    </div>
                  </div>
                  {post.content && (
                    <p className="text-sm whitespace-pre-wrap">{post.content}</p>
                  )}
                  {parseImages(post.images).length > 0 && (
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      {parseImages(post.images).map((img: string, i: number) => (
                        <img
                          key={i}
                          src={img}
                          alt=""
                          className="rounded-xl w-full aspect-square object-cover"
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="px-4 py-4 space-y-2">
            {group.members.map((member) => (
              <Link
                key={member.id}
                href={`/profile/${member.user.username}`}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors"
              >
                <UserAvatar user={member.user} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{member.user.name}</p>
                  <p className="text-xs text-gray-400">@{member.user.username}</p>
                </div>
                {member.role === "admin" && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary-600/20 text-primary-300">
                    Admin
                  </span>
                )}
                {member.user.department && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-dark-700 text-gray-500 dark:text-gray-400">
                    {member.user.department}
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
