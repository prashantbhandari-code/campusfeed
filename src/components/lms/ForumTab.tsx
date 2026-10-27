"use client";
import { useState, useEffect } from "react";
import { useSession } from "@/lib/auth/session";
import { HiChatBubbleLeftRight, HiPencilSquare } from "react-icons/hi2";
import { format } from "date-fns";

interface ForumPost {
  id: string; title: string; content: string; pinned: boolean; resolved: boolean; createdAt: string;
  author: { id: string; name: string; avatar?: string };
  _count: { replies: number };
}

interface ForumReply {
  id: string; content: string; createdAt: string;
  author: { id: string; name: string; avatar?: string };
}

export default function ForumTab({ courseId }: { courseId: string }) {
  const { data: session } = useSession();
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [replies, setReplies] = useState<Record<string, ForumReply[]>>({});
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/courses/" + courseId + "/forum")
      .then(r => r.json())
      .then(d => { setPosts(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [courseId]);

  const createPost = async () => {
    if (!newTitle || !newContent) return;
    const res = await fetch("/api/courses/" + courseId + "/forum", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle, content: newContent })
    });
    if (res.ok) {
      const post = await res.json();
      setPosts([{ ...post, author: { id: session?.user?.id, name: session?.user?.name, avatar: session?.user?.avatar }, _count: { replies: 0 } }, ...posts]);
      setNewTitle(""); setNewContent(""); setShowNew(false);
    }
  };

  const loadReplies = async (postId: string) => {
    if (expandedPost === postId) { setExpandedPost(null); return; }
    if (!replies[postId]) {
      const res = await fetch("/api/forum/" + postId + "/replies");
      if (res.ok) { const data = await res.json(); setReplies({ ...replies, [postId]: Array.isArray(data) ? data : [] }); }
    }
    setExpandedPost(postId);
  };

  const addReply = async (postId: string) => {
    const text = replyTexts[postId] || "";
    if (!text) return;
    const res = await fetch("/api/forum/" + postId + "/replies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text })
    });
    if (res.ok) {
      const reply = await res.json();
      setReplies({ ...replies, [postId]: [...(replies[postId] || []), { ...reply, author: { id: session?.user?.id, name: session?.user?.name, avatar: session?.user?.avatar } }] });
      setReplyTexts({ ...replyTexts, [postId]: "" });
      setPosts(posts.map(p => p.id === postId ? { ...p, _count: { replies: p._count.replies + 1 } } : p));
    }
  };

  if (loading) return <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}</div>;

  return (
    <div className="space-y-4">
      <button onClick={() => setShowNew(!showNew)} className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium">
        <HiPencilSquare className="w-4 h-4" /> New Discussion
      </button>

      {showNew && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 space-y-3">
          <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Discussion title" className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white text-sm" />
          <textarea value={newContent} onChange={e => setNewContent(e.target.value)} placeholder="Describe your question or topic..." className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white text-sm h-24 resize-none" />
          <div className="flex gap-2">
            <button onClick={createPost} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">Post</button>
            <button onClick={() => setShowNew(false)} className="px-4 py-2 text-gray-500 text-sm">Cancel</button>
          </div>
        </div>
      )}

      {posts.length > 0 ? posts.map(post => (
        <div key={post.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div onClick={() => loadReplies(post.id)} className="p-4 cursor-pointer hover:bg-gray-50">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {post.pinned && <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-medium">Pinned</span>}
                {post.resolved && <span className="text-xs bg-green-100 text-green-600 px-1.5 py-0.5 rounded font-medium">Resolved</span>}
              </div>
              <h3 className="font-semibold text-sm dark:text-white">{post.title}</h3>
              <p className="text-xs text-gray-400 mt-1 line-clamp-2">{post.content}</p>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-400 mt-2">
              <span>{post.author?.name}</span>
              <span>{format(new Date(post.createdAt), "MMM d")}</span>
              <span className="flex items-center gap-1"><HiChatBubbleLeftRight className="w-3 h-3" /> {post._count.replies} replies</span>
            </div>
          </div>
          </div>

          {expandedPost === post.id && (
            <div className="border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              {(replies[post.id] || []).map((reply: ForumReply) => (
                <div key={reply.id} className="px-4 py-3 border-b border-gray-100 dark:border-gray-700/50 last:border-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-[8px] font-bold">{(reply.author?.name || "U").charAt(0)}</div>
                    <span className="text-xs font-medium dark:text-white">{reply.author?.name}</span>
                    <span className="text-xs text-gray-400">{format(new Date(reply.createdAt), "MMM d, h:mm a")}</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 ml-7">{reply.content}</p>
                </div>
              ))}
              <div className="px-4 py-3 flex gap-2">
                <input value={replyTexts[post.id] || ""} onChange={e => setReplyTexts({ ...replyTexts, [post.id]: e.target.value })} onKeyDown={e => e.key === "Enter" && addReply(post.id)} placeholder="Write a reply..." className="flex-1 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white text-sm" />
                <button onClick={() => addReply(post.id)} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm">Reply</button>
              </div>
            </div>
          )}
        </div>
      )) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-8 border border-gray-200 dark:border-gray-700 text-center">
          <HiChatBubbleLeftRight className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
          <p className="text-sm text-gray-400">No discussions yet. Start one!</p>
        </div>
      )}
    </div>
  );
}
