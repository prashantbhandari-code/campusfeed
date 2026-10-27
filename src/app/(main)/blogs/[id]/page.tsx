"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/lib/auth/session";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import UserAvatar from "@/components/ui/UserAvatar";
import { formatDate } from "@/lib/utils";
import {
  HiArrowLeft,
  HiOutlinePaperAirplane,
  HiOutlineTrash,
} from "react-icons/hi2";

export default function BlogDetailPage() {
  const { data: session } = useSession();
  const user = session?.user;
  const params = useParams();
  const router = useRouter();
  const blogId = params.id as string;

  const [blog, setBlog] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  // Preserve comment draft even if blog is deleted during write
  const [preservedComment, setPreservedComment] = useState<string>("");

  useEffect(() => {
    fetchBlog();
  }, [blogId]);

  const fetchBlog = async () => {
    try {
      const res = await fetch("/api/blogs/" + blogId);
      if (res.status === 404) {
        // Blog was deleted — preserve any unsent comment text so the user
        // can copy it before we redirect, instead of silently losing it.
        if (comment.trim() || preservedComment.trim()) {
          setPreservedComment(comment || preservedComment);
        }
        toast.error("Blog not found");
        router.push("/blogs");
        return;
      }
      if (!res.ok) throw new Error();
      setBlog(await res.json());
    } catch {
      toast.error("Couldn't load the blog");
    } finally {
      setLoading(false);
    }
  };

  const submitComment = async () => {
    if (!comment.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/blogs/${blogId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: comment }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "comment failed");
      setBlog((prev: any) => ({
        ...prev,
        comments: [...(prev.comments || []), data],
        _count: { comments: (prev._count?.comments || 0) + 1 },
      }));
      setComment("");
    } catch (error) {
      toast.error(error instanceof Error ? `Couldn't comment — ${error.message}` : "Couldn't comment");
    } finally {
      setSending(false);
    }
  };

  const deleteComment = async (commentId: string) => {
    setDeletingCommentId(commentId);
    try {
      const res = await fetch(`/api/blogs/${blogId}/comments`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "delete failed");
      }
      setBlog((prev: any) => ({
        ...prev,
        comments: (prev.comments || []).filter((c: any) => c.id !== commentId),
        _count: { comments: Math.max(0, (prev._count?.comments || 1) - 1) },
      }));
    } catch (error) {
      toast.error(error instanceof Error ? `Couldn't delete — ${error.message}` : "Couldn't delete");
    } finally {
      setDeletingCommentId(null);
    }
  };

  const deleteBlog = async () => {
    if (!confirm("Delete this blog permanently? Comments go with it.")) return;
    try {
      const res = await fetch("/api/blogs/" + blogId, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "delete failed");
      }
      toast.success("Blog deleted");
      router.push("/blogs");
    } catch (error) {
      toast.error(error instanceof Error ? `Couldn't delete — ${error.message}` : "Couldn't delete");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500" />
      </div>
    );
  }
  // Blog was deleted but we preserved the comment — show a recovery UI
  if (!blog && preservedComment.trim()) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-900 pb-20 lg:pb-0">
        <div className="sticky top-0 z-10 bg-white/95 dark:bg-dark-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-white/[0.06]">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
            <button onClick={() => router.push("/blogs")} className="p-1 text-gray-600 dark:text-gray-400">
              <HiArrowLeft className="text-xl" />
            </button>
            <h1 className="flex-1 font-semibold text-gray-900 dark:text-white truncate">Blog Deleted</h1>
          </div>
        </div>
        <div className="max-w-2xl mx-auto px-5 py-6">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">
              This blog was deleted while you were writing a comment.
            </p>
            <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-4">
              Your draft has been preserved below. Copy it before leaving.
            </p>
            <div className="bg-white dark:bg-dark-800 rounded-lg p-3 border border-yellow-200 dark:border-yellow-800">
              <textarea
                readOnly
                value={preservedComment}
                onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                className="w-full text-sm text-gray-900 dark:text-white bg-transparent resize-none focus:outline-none"
                rows={4}
              />
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(preservedComment);
                toast.success("Copied to clipboard");
              }}
              className="mt-2 text-sm text-primary-600 dark:text-primary-400 font-medium hover:underline"
            >
              Copy draft →
            </button>
          </div>
        </div>
      </div>
    );
  }
  if (!blog) return null;

  const isOwn = blog.author?.id === user?.id;
  const commentCount = blog._count?.comments ?? (blog.comments?.length || 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-900 pb-20 lg:pb-0">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-white/95 dark:bg-dark-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-white/[0.06]">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1 text-gray-600 dark:text-gray-400">
            <HiArrowLeft className="text-xl" />
          </button>
          <h1 className="flex-1 font-semibold text-gray-900 dark:text-white truncate">Blog</h1>
          {isOwn && (
            <button
              onClick={deleteBlog}
              className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
              title="Delete blog"
            >
              <HiOutlineTrash className="text-lg" />
            </button>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-5 py-6">
        {/* Title + author */}
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{blog.title}</h2>
        <div className="flex items-center gap-3 mb-6">
          <UserAvatar user={blog.author} size="sm" />
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{blog.author.name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {blog.author.department && <span>{blog.author.department} · </span>}
              {formatDate(blog.createdAt)}
            </p>
          </div>
        </div>

        {/* Body */}
        <article className="text-sm leading-relaxed text-gray-700 dark:text-gray-200 whitespace-pre-wrap mb-8">
          {blog.content}
        </article>

        {/* Comments */}
        <div className="border-t border-gray-200 dark:border-white/[0.06] pt-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
            {commentCount} {commentCount === 1 ? "comment" : "comments"}
          </h3>

          <div className="space-y-4 mb-5">
            {(blog.comments || []).map((c: any) => (
              <div key={c.id} className="flex items-start gap-3">
                <UserAvatar user={c.author} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-semibold text-gray-900 dark:text-white">{c.author.name}</span>{" "}
                    <span className="text-xs text-gray-500 dark:text-gray-400">{formatDate(c.createdAt)}</span>
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap break-words">
                    {c.content}
                  </p>
                </div>
                {c.author?.id === user?.id && (
                  <button
                    onClick={() => deleteComment(c.id)}
                    disabled={deletingCommentId === c.id}
                    className="p-1 rounded text-gray-400 hover:text-red-500 dark:hover:text-red-400 flex-shrink-0"
                    title="Delete comment"
                  >
                    <HiOutlineTrash className="text-sm" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Composer — every signed-in user can comment, author included */}
          <div className="flex items-center gap-3">
            <UserAvatar user={user ?? { name: "" }} size="sm" />
            <div className="flex-1 flex items-center gap-2 bg-gray-100 dark:bg-dark-700 rounded-xl px-3 py-2">
              <input
                type="text"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitComment();
                }}
                placeholder="Write a comment…"
                maxLength={5000}
                className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none"
              />
              <button
                onClick={submitComment}
                disabled={!comment.trim() || sending}
                className="text-primary-600 dark:text-primary-400 disabled:opacity-40"
                title="Send comment"
              >
                <HiOutlinePaperAirplane className="text-lg" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
