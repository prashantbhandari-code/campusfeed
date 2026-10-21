"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { HiArrowLeft } from "react-icons/hi2";

const TITLE_MAX = 150;
const CONTENT_MAX = 50000;

export default function NewBlogPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [publishing, setPublishing] = useState(false);

  const canPublish = title.trim().length >= 3 && content.trim().length > 0 && !publishing;

  const publish = async () => {
    if (!canPublish) return;
    setPublishing(true);
    try {
      const res = await fetch("/api/blogs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), content }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "publish failed");
      toast.success("Published!");
      router.push(`/blogs/${data.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? `Couldn't publish — ${error.message}` : "Couldn't publish");
      setPublishing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 md:py-8">
      <div className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-200 dark:border-white/[0.08] overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.2)]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-white/[0.06]">
          <button
            onClick={() => router.back()}
            className="p-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            title="Back"
          >
            <HiArrowLeft className="text-xl" />
          </button>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">New blog</h2>
          <button
            onClick={publish}
            disabled={!canPublish}
            className="px-4 py-1.5 bg-primary-600 hover:bg-primary-700 rounded-xl text-sm font-medium text-white transition-colors disabled:opacity-50"
          >
            {publishing ? "Publishing…" : "Publish"}
          </button>
        </div>

        {/* Composer */}
        <div className="p-5">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={TITLE_MAX}
            placeholder="Title"
            className="w-full text-xl font-bold text-gray-900 dark:text-white bg-transparent placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none mb-3"
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={CONTENT_MAX}
            placeholder="Write your blog…"
            rows={16}
            className="w-full text-sm leading-relaxed text-gray-700 dark:text-gray-200 bg-transparent placeholder-gray-400 dark:placeholder-gray-500 resize-none focus:outline-none min-h-[320px]"
          />
          <div className="flex justify-end gap-4 text-xs text-gray-400 dark:text-gray-500 pt-2 border-t border-gray-50 dark:border-white/[0.04]">
            <span>{title.length}/{TITLE_MAX}</span>
            <span>{content.length.toLocaleString()}/{CONTENT_MAX.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
