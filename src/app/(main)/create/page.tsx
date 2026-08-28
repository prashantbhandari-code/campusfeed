"use client";

import { useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import UserAvatar from "@/components/UserAvatar";
import { HiOutlinePhotograph, HiX } from "react-icons/hi";
import toast from "react-hot-toast";

export default function CreatePage() {
  const { data: session } = useSession();
  const router = useRouter();
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
        if (data.url) setImages((prev) => [...prev, data.url]);
      }
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handlePost = async () => {
    if (!content.trim() && images.length === 0) return;
    setPosting(true);

    try {
      await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, images }),
      });
      toast.success("Post created!");
      router.push("/feed");
    } catch {
      toast.error("Failed to create post");
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Create Post</h1>

      <div className="glass rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <UserAvatar user={user} />
          <div>
            <p className="font-semibold">{user?.name}</p>
            <p className="text-xs text-gray-500">@{user?.username}</p>
          </div>
        </div>

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What's on your mind?"
          className="w-full bg-dark-700 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary-500 min-h-[150px] mb-4"
          rows={6}
          autoFocus
        />

        {/* Image Previews */}
        {images.length > 0 && (
          <div className="grid grid-cols-2 gap-2 mb-4">
            {images.map((img, i) => (
              <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-dark-700">
                <img src={img} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => setImages(images.filter((_, idx) => idx !== i))}
                  className="absolute top-2 right-2 bg-black/60 rounded-full p-1.5 hover:bg-black/80"
                >
                  <HiX className="text-sm" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-white/5">
          <div className="flex items-center gap-3">
            <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-gray-400 hover:text-green-400 hover:bg-white/5 transition-all"
            >
              <HiOutlinePhotograph className="text-xl" />
              {uploading ? "Uploading..." : "Add Photos"}
            </button>
          </div>

          <button
            onClick={handlePost}
            disabled={posting || (!content.trim() && images.length === 0)}
            className="px-8 py-2.5 bg-primary-600 hover:bg-primary-700 rounded-xl font-semibold transition-all disabled:opacity-50"
          >
            {posting ? "Posting..." : "Share Post"}
          </button>
        </div>
      </div>
    </div>
  );
}
