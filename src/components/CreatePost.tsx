"use client";

import { useState, useRef } from "react";
import { useSession } from "@/lib/appwrite-session";
import UserAvatar from "./UserAvatar";
import { HiOutlinePhotograph, HiX } from "react-icons/hi";
import toast from "react-hot-toast";

interface CreatePostProps {
  onPostCreated?: (post: any) => void;
}

export default function CreatePost({ onPostCreated }: CreatePostProps) {
  const { data: session } = useSession();
  const user = session?.user as any;
  const [content, setContent] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [posting, setPosting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData();
        formData.append("file", files[i]);
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        const data = await res.json();
        if (data.url) {
          setImages((prev) => [...prev, data.url]);
        }
      }
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && images.length === 0) return;

    setPosting(true);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, images }),
      });
      const post = await res.json();
      setContent("");
      setImages([]);
      onPostCreated?.(post);
      toast.success("Post created!");
    } catch {
      toast.error("Failed to create post");
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="glass rounded-2xl p-4 mb-4">
      <div className="flex gap-3">
        <UserAvatar user={user} />
        <div className="flex-1">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's on your mind?"
            className="w-full bg-gray-100 dark:bg-dark-700 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary-500 min-h-[80px]"
            rows={3}
          />

          {/* Image Preview */}
          {images.length > 0 && (
            <div className="grid grid-cols-2 gap-2 mt-3">
              {images.map((img, i) => (
                <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-dark-700">
                  <img src={img} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => setImages(images.filter((_, idx) => idx !== i))}
                    className="absolute top-2 right-2 bg-black/60 rounded-full p-1 hover:bg-black/80"
                  >
                    <HiX className="text-sm" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2">
              <label
                htmlFor="file-upload-create"
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-gray-400 hover:text-green-400 hover:bg-white/5 transition-all text-sm cursor-pointer"
              >
                <HiOutlinePhotograph className="text-lg" />
                {uploading ? "Uploading..." : "Photo"}
              </label>
              <input
                id="file-upload-create"
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="sr-only"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={posting || (!content.trim() && images.length === 0)}
              className="px-6 py-2 bg-primary-600 hover:bg-primary-700 rounded-xl font-semibold text-sm transition-all disabled:opacity-50"
            >
              {posting ? "Posting..." : "Post"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
