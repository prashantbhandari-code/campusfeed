"use client";

import { useState, useRef, memo } from "react";
import { useSession } from "@/lib/appwrite-session";
import { useRouter } from "next/navigation";
import Lightbox from "./Lightbox";
import UserAvatar from "./UserAvatar";
import { HiOutlineHeart, HiHeart, HiOutlineChat, HiOutlineShare, HiBookmark, HiDotsHorizontal, HiOutlineTrash, HiOutlinePencil, HiOutlineBan } from "react-icons/hi";
import { formatDate, parseImages } from "@/lib/utils";
import toast from "react-hot-toast";

interface PostCardProps {
  post: any;
  onDelete?: () => void;
}

function PostCard({ post, onDelete }: PostCardProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [isLiked, setIsLiked] = useState(post.isLiked);
  const [likesCount, setLikesCount] = useState(post.likesCount);
  const [isSaved, setIsSaved] = useState(post.isSaved);
  const [savesCount, setSavesCount] = useState(post.savesCount || 0);
  const [comments, setComments] = useState(post.comments || []);
  const [commentText, setCommentText] = useState("");
  const [showComments, setShowComments] = useState(false);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [heartAnimation, setHeartAnimation] = useState(false);
  const [doubleTapHeart, setDoubleTapHeart] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content || "");
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
    const wasLiked = isLiked;
    const prevCount = likesCount;
    setIsLiked(!wasLiked);
    setLikesCount(wasLiked ? prevCount - 1 : prevCount + 1);
    if (!wasLiked) { setHeartAnimation(true); setTimeout(() => setHeartAnimation(false), 300); }
    try {
      const res = await fetch(`/api/posts/${post.id}/like`, { method: "POST" });
      const data = await res.json();
      setIsLiked(data.isLiked);
      setLikesCount(data.likesCount);
    } catch { setIsLiked(wasLiked); setLikesCount(prevCount); toast.error("Failed"); }
  };

  const handleSave = async () => {
    const wasSaved = isSaved;
    setIsSaved(!wasSaved);
    toast.success(wasSaved ? "Removed" : "Saved");
    try {
      const res = await fetch(`/api/posts/${post.id}/save`, { method: "POST" });
      const data = await res.json();
      setIsSaved(data.isSaved);
    } catch { setIsSaved(wasSaved); toast.error("Failed"); }
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

  
  const handleEdit = async () => {
    if (!editContent.trim()) return;
    try {
      const res = await fetch(`/api/posts/${post.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: editContent }) });
      if (res.ok) { post.content = editContent; setIsEditing(false); toast.success("Updated"); }
    } catch { toast.error("Failed"); }
  };

  const handleBlock = async () => {
    if (!confirm(`Block ${post.author.name}?`)) return;
    try { await fetch(`/api/users/${post.author.id}/block`, { method: "POST" }); onDelete?.(); toast.success("Blocked"); } catch { toast.error("Failed"); }
    setShowMenu(false);
  };

  const parsedImages = (() => { try { return JSON.parse(post.images || "[]"); } catch { return []; } })();

  return (
    <div className="mb-6 glass-card rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100 dark:border-white/[0.06]">
        <div
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => router.push(`/profile/${post.author.username}`)}
        >
          <UserAvatar user={post.author} size="md" />
          <div>
            <div className="flex items-center gap-1.5">
              <p className="font-semibold text-sm text-gray-900 dark:text-white hover:text-primary-400 transition-colors">{post.author.name}</p>
              {post.author.role === 'admin' && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-600 text-white">
                  👑 Dean
                </span>
              )}
              {post.author.role === 'teacher' && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-green-600 text-white">
                  📚 Teacher
                </span>
              )}
              {post.author.verified && post.author.role !== 'admin' && post.author.role !== 'teacher' && (
                <span className="text-blue-500 text-xs">✓</span>
              )}
            </div>
            {post.author.department && (
              <p className="text-[10px] text-campus-400">{post.author.department}</p>
            )}
          </div>
        </div>
        <div className="relative">
          <button onClick={() => setShowMenu(!showMenu)} className="text-gray-500 hover:text-gray-900 dark:hover:text-white p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 self-center"><HiDotsHorizontal className="text-xl" /></button>
          {showMenu && (
            <div className="absolute right-0 top-10 bg-white dark:bg-dark-700 border border-gray-200 dark:border-white/10 rounded-xl shadow-xl py-2 min-w-[160px] z-50">
              {user?.id === post.authorId && <button onClick={() => { setIsEditing(true); setShowMenu(false); }} className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5"><HiOutlinePencil className="w-4 h-4" /> Edit</button>}
              {user?.id === post.authorId && <button onClick={() => { handleDelete(); setShowMenu(false); }} className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-500 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-white/5"><HiOutlineTrash className="w-4 h-4" /> Delete</button>}
              {user?.id !== post.authorId && <button onClick={handleBlock} className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-500 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-white/5"><HiOutlineBan className="w-4 h-4" /> Block</button>}
            </div>
          )}
        </div>
      </div>

      {/* Images — full width */}
      {images.length > 0 && (
        <div
          className="relative bg-gray-100 dark:bg-dark-800 cursor-pointer"
          onClick={handleDoubleTap}
        >
          {images.length === 1 ? (
            <div className="relative aspect-square">
              <img src={images[0]} alt="" className="w-full h-full object-cover" loading="lazy" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-0.5">
              {images.slice(0, 4).map((img, i) => (
                <div key={i} className="relative aspect-square">
                  <img src={img} alt="" className="w-full h-auto rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity" onClick={() => { setLightboxImages(parsedImages); setLightboxIndex(i); }} />
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
      {isEditing ? (
        <div className="px-4 py-3">
          <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} className="w-full bg-gray-100 dark:bg-dark-700 rounded-xl p-3 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary-500 resize-none" rows={3} maxLength={5000} />
          <div className="flex justify-end gap-2 mt-2">
            <button onClick={() => setIsEditing(false)} className="px-3 py-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">Cancel</button>
            <button onClick={handleEdit} className="px-3 py-1 text-sm bg-primary-600 hover:bg-primary-700 rounded-lg text-white">Save</button>
          </div>
        </div>
      ) : post.content ? (
        <p className="px-4 py-3 text-sm leading-relaxed text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{post.content}</p>
      ) : null}

      {/* Actions Bar — Instagram style */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-5">
          <button onClick={handleLike} className="transition-all">
            {isLiked ? (
              <HiHeart className={`text-2xl text-red-500 ${heartAnimation ? "animate-heart" : ""}`} />
            ) : (
              <HiOutlineHeart className="text-2xl text-gray-500 dark:text-gray-200 hover:text-gray-400" />
            )}
          </button>
          <button onClick={() => setShowComments(!showComments)} className="transition-all">
            <HiOutlineChat className="text-2xl text-gray-500 dark:text-gray-200 hover:text-gray-400 -scale-x-100" />
          </button>
          <button className="transition-all">
            <HiOutlineShare className="text-2xl text-gray-500 dark:text-gray-200 hover:text-gray-400" />
          </button>
        </div>
        <button onClick={handleSave} className="transition-all">
          {isSaved ? (
            <HiBookmark className="text-2xl text-gray-700 dark:text-gray-200" />
          ) : (
            <HiBookmark className="text-2xl text-gray-500 dark:text-gray-200 hover:text-gray-400" />
          )}
        </button>
      </div>

      {/* Likes count */}
      {likesCount > 0 && (
        <p className="px-4 pb-1 text-sm font-semibold text-gray-900 dark:text-white tracking-tight">{likesCount} {likesCount === 1 ? "like" : "likes"}</p>
      )}

      {/* Comments Section */}
      {showComments && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-100 dark:border-white/[0.06] pt-3">
          {comments.slice(0, 5).map((comment: any) => (
            <div key={comment.id} className="flex gap-3">
              <UserAvatar user={comment.author} size="sm" />
              <div className="flex-1">
                <p className="text-sm">
                  <span className="font-semibold mr-1 text-gray-900 dark:text-white">{comment.author.name}</span>
                  {comment.content}
                </p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{formatDate(comment.createdAt)}</p>
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
              className="flex-1 bg-gray-100 dark:bg-dark-700 rounded-full px-4 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary-500/50 placeholder-gray-400 dark:placeholder-gray-500"
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


export default memo(PostCard);