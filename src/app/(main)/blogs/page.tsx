"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import UserAvatar from "@/components/UserAvatar";
import { formatDate } from "@/lib/utils";
import { HiOutlinePencilSquare, HiOutlineChatBubbleLeftRight } from "react-icons/hi2";

export default function BlogsPage() {
  const router = useRouter();
  const [blogs, setBlogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  // Cancels the in-flight fetch when a newer one starts or the page unmounts —
  // same supersede pattern as the Messages page list.
  const fetchController = useRef<AbortController | null>(null);

  useEffect(() => {
    fetchBlogs();
    // Refresh on wake so a blog published in another tab shows up.
    const wake = () => {
      if (document.visibilityState === "visible") fetchBlogs();
    };
    document.addEventListener("visibilitychange", wake);
    window.addEventListener("focus", wake);
    return () => {
      document.removeEventListener("visibilitychange", wake);
      window.removeEventListener("focus", wake);
      fetchController.current?.abort();
    };
  }, []);

  const fetchBlogs = async () => {
    fetchController.current?.abort();
    const controller = new AbortController();
    fetchController.current = controller;
    try {
      const res = await fetch("/api/blogs", { signal: controller.signal });
      const data = await res.json();
      setBlogs(Array.isArray(data) ? data : []);
    } catch (error) {
      if ((error as Error)?.name === "AbortError") return;
      console.error("Blogs fetch failed:", error);
    } finally {
      if (fetchController.current === controller) setLoading(false);
    }
  };

  const excerpt = (content: string) =>
    content.length > 180 ? content.slice(0, 180).trimEnd() + "…" : content;

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 md:py-8">
      <div className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-200 dark:border-white/[0.08] overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.2)]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-white/[0.06]">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Blogs</h2>
          <button
            onClick={() => router.push("/blogs/new")}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 rounded-xl text-sm font-medium text-white transition-colors"
          >
            <HiOutlinePencilSquare className="text-base" />
            Write
          </button>
        </div>

        {/* Blog list */}
        <div>
          {loading ? (
            <div className="p-4 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-gray-200 dark:bg-dark-600 rounded w-2/3 mb-2" />
                  <div className="h-3 bg-gray-200 dark:bg-dark-600 rounded w-full mb-1" />
                  <div className="h-3 bg-gray-200 dark:bg-dark-600 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : blogs.length === 0 ? (
            <div className="p-12 text-center">
              <span className="text-6xl mb-4 block">✍️</span>
              <p className="text-gray-500 dark:text-gray-400 text-sm">No blogs yet</p>
              <button
                onClick={() => router.push("/blogs/new")}
                className="mt-2 text-sm text-primary-600 dark:text-primary-400 font-medium hover:underline"
              >
                Write the first one →
              </button>
            </div>
          ) : (
            blogs.map((blog) => (
              <div
                key={blog.id}
                onClick={() => router.push(`/blogs/${blog.id}`)}
                className="px-5 py-4 hover:bg-gray-50 dark:hover:bg-white/[0.04] cursor-pointer transition-all active:bg-gray-100 dark:active:bg-white/[0.08] border-b border-gray-50 dark:border-white/[0.04] last:border-b-0"
              >
                <div className="flex items-center gap-2 mb-2">
                  <UserAvatar user={blog.author} size="sm" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {blog.author.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {blog.author.department && <span>{blog.author.department} · </span>}
                      {formatDate(blog.createdAt)}
                    </p>
                  </div>
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-1 line-clamp-1">
                  {blog.title}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                  {excerpt(blog.content)}
                </p>
                <div className="flex items-center gap-1 mt-2 text-xs text-gray-400 dark:text-gray-500">
                  <HiOutlineChatBubbleLeftRight className="text-sm" />
                  {blog._count?.comments || 0} {(blog._count?.comments || 0) === 1 ? "comment" : "comments"}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
