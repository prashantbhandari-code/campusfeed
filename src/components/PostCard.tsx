"use client";

import { useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import UserAvatar from "./UserAvatar";
import { HiOutlineHeart, HiHeart, HiOutlineChat, HiOutlineShare, HiBookmark } from "react-icons/hi";
import { formatDate, parseImages } from "@/lib/utils";
import toast from "react-hot-toast";

interface PostCardProps {
  post: any;
  onDelete?: () => void;
}

export default function PostCard({ post, onDelete }: PostCardProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [isLiked, setIsLiked] = useState(post.isLiked);
  const [likesCount, setLikesCount] = useState(post.likesCount);
  const [isSaved, setIsSaved] = useState(post.isSaved);
  const [savesCount, setSavesCount] = useState(post.savesCount || 0);
  const [comments, setComments] = useState(post.comments || []);
  const [commentText, setCommentText] = useState("");
  const [showComments, setShowComments] = useState(false);
  const [heartAnimation, setHeartAnimation] = useState(false);
  const [doubleTapHeart, setDoubleTapHeart] = useState(false);
  const lastTapRef = useRef(0);
  const user = session?.user as any;
  const images = parseImages(post.images);

  // Double-tap to like
  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      if (!isLiked) {
        handleLike();
      }
      setDoubleTapHeart(true);
      setTimeout(() => setDoubleTapHeart(false), 800);
    }
    lastTapRef.current = now;
  };

  const handleLike = async () => {
    try {
      const res = await fetch(`/api/posts/${post.id}/like`, { method: "POST" });
      const data = await res.json();
      setIsLiked(data.isLiked);
      setLikesCount(data.likesCount);
      if (data.isLiked) {
        setHeartAnimation(true);
        setTimeout(() => setHeartAnimation(false), 300);
      }
    } catch {
      toast.error("Failed to like post");
    }
  };

  const handleSave = async () => {
    try {
      const res = await fetch(`/api/posts/${post.id}/save`, { method: "POST" });
      const data = await res.json();
      setIsSaved(data.isSaved);
      toast.success(data.isSaved ? "Saved" : "Removed from saved");
    } catch {
      toast.error("Failed to save post");
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    try {
      const res = await fetch(`/api/posts/${post.id}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: commentText }),
      });
      const newComment = await res.json();
      setComments([newComment, ...comments]);
      setCommentText("");
    } catch {
      toast.error("Failed to comment");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this post?")) return;
    try {
      await fetch(`/api/posts/${post.id}`, { method: "DELETE" });
      onDelete?.();
      toast.success("Post deleted");
    } catch {
      toast.error("Failed to delete");
    }
  };

  return (
    <div className="mb-4">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => router.push(`/profile/${post.author.username}`)}
        >
          <UserAvatar user={post.author} size="md" />
          <div>
            <p className="font-semibold text-sm hover:text-primary-400 transition-colors">{post.author.name}</p>
            {post.author.department && (
              <p className="text-[10px] text-campus-400">{post.author.department}</p>
            )}
          </div>
        </div>
        {user?.id === post.authorId && (
          <button onClick={handleDelete} className="text-gray-500 hover:text-red-400 p-2 rounded-lg hover:bg-white/5 text-sm">
            ···
          </button>
        )}
      </div>

      {/* Images — full width */}
      {images.length > 0 && (
        <div
          className="relative bg-dark-800 cursor-pointer"
          onClick={handleDoubleTap}
        >
          {images.length === 1 ? (
            <div className="relative aspect-square">
              <img src={images[0]} alt="" className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-0.5">
              {images.slice(0, 4).map((img, i) => (
                <div key={i} className="relative aspect-square">
                  <img src={img} alt="" className="w-full h-full object-cover" />
                  {i === 3 && images.length > 4 && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <span className="text-white text-2xl font-bold">+{images.length - 4}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          {/* Double-tap heart overlay */}
          {doubleTapHeart && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <HiHeart className="text-white text-8xl drop-shadow-lg animate-bounce" style={{ filter: "drop-shadow(0 0 20px rgba(255,255,255,0.5))" }} />
            </div>
          )}
        </div>
      )}

      {/* Content */}
      {post.content && (
        <p className="px-4 py-3 text-sm text-gray-200 whitespace-pre-wrap">{post.content}</p>
      )}

      {/* Actions Bar — Instagram style */}
      <div className="px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={handleLike} className="transition-all">
            {isLiked ? (
              <HiHeart className={`text-2xl text-red-500 ${heartAnimation ? "animate-heart" : ""}`} />
            ) : (
              <HiOutlineHeart className="text-2xl text-gray-200 hover:text-gray-400" />
            )}
          </button>
          <button onClick={() => setShowComments(!showComments)} className="transition-all">
            <HiOutlineChat className="text-2xl text-gray-200 hover:text-gray-400 -scale-x-100" />
          </button>
          <button className="transition-all">
            <HiOutlineShare className="text-2xl text-gray-200 hover:text-gray-400" />
          </button>
        </div>
        <button onClick={handleSave} className="transition-all">
          {isSaved ? (
            <HiBookmark className="text-2xl text-gray-200" />
          ) : (
            <HiBookmark className="text-2xl text-gray-200 hover:text-gray-400" />
          )}
        </button>
      </div>

      {/* Likes count */}
      {likesCount > 0 && (
        <p className="px-4 pb-1 text-sm font-semibold">{likesCount} likes</p>
      )}

      {/* Comments Section */}
      {showComments && (
        <div className="px-4 pb-4 space-y-3">
          {comments.slice(0, 5).map((comment: any) => (
            <div key={comment.id} className="flex gap-3">
              <UserAvatar user={comment.author} size="sm" />
              <div className="flex-1">
                <p className="text-sm">
                  <span className="font-semibold mr-1">{comment.author.name}</span>
                  {comment.content}
                </p>
                <p className="text-[10px] text-gray-500 mt-0.5">{formatDate(comment.createdAt)}</p>
              </div>
            </div>
          ))}

          <form onSubmit={handleComment} className="flex gap-2 mt-3">
            <UserAvatar user={user} size="sm" />
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 bg-transparent text-sm focus:outline-none placeholder-gray-500"
            />
            {commentText.trim() && (
              <button type="submit" className="text-primary-400 text-sm font-semibold">
                Post
              </button>
            )}
          </form>
        </div>
      )}
    </div>
  );
}
