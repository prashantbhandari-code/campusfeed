"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import UserAvatar from "./UserAvatar";
import { HiPlus, HiHeart, HiPaperAirplane, HiX } from "react-icons/hi";
import toast from "react-hot-toast";

export default function StoryBar() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const [stories, setStories] = useState<any[]>([]);
  const [viewingStory, setViewingStory] = useState<any>(null);
  const [storyData, setStoryData] = useState<any>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState<any[]>([]);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const commentInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchStories(); }, []);

  const fetchStories = async () => {
    try {
      const res = await fetch("/api/stories");
      const data = await res.json();
      const valid = data.filter((s: any) => {
        if (!s.images) return false;
        try { const imgs = JSON.parse(s.images); return Array.isArray(imgs) && imgs.some((i: any) => i && typeof i === "string" && i.length > 0); } catch { return false; }
      });
      setStories(valid);
    } catch {}
  };

  const handleCreateStory = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
      const { url } = await uploadRes.json();
      await fetch("/api/stories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ images: [url] }) });
      fetchStories();
      toast.success("Story posted!");
    } catch { toast.error("Failed to post story"); }
  };

  const openStory = async (story: any) => {
    setViewingStory(story);
    setCurrentImageIndex(0);
    setShowComments(false);
    // Fetch story with likes/comments
    try {
      const res = await fetch("/api/stories/" + story.id);
      const data = await res.json();
      setStoryData(data);
      setIsLiked(data.isLiked);
      setLikeCount(data.likeCount);
      setComments(data.comments || []);
    } catch {}
  };

  const getStoryImages = (story: any): string[] => {
    if (!story?.images) return [];
    let arr: any[];
    if (Array.isArray(story.images)) { arr = story.images; }
    else { try { const p = JSON.parse(story.images); arr = Array.isArray(p) ? p : []; } catch { return []; } }
    return arr.filter((img: any) => img && typeof img === "string" && img.length > 0);
  };

  const handleLike = async () => {
    if (!viewingStory) return;
    try {
      const res = await fetch("/api/stories/" + viewingStory.id, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "like" }) });
      const data = await res.json();
      setIsLiked(data.liked);
      setLikeCount((prev) => data.liked ? prev + 1 : prev - 1);
    } catch {}
  };

  const handleComment = async () => {
    if (!comment.trim() || !viewingStory) return;
    try {
      const res = await fetch("/api/stories/" + viewingStory.id, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "comment", content: comment }) });
      if (res.ok) {
        const data = await res.json();
        setComments((prev) => [...prev, data]);
        setComment("");
      }
    } catch {}
  };

  useEffect(() => {
    if (!viewingStory) return;
    const images = getStoryImages(viewingStory);
    if (images.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentImageIndex((prev) => {
        if (prev >= images.length - 1) { setViewingStory(null); return 0; }
        return prev + 1;
      });
    }, 5000);
    return () => clearInterval(timer);
  }, [viewingStory, currentImageIndex]);

  const groupedStories = stories.reduce((acc: any, story: any) => {
    if (!acc[story.authorId]) acc[story.authorId] = { author: story.author, stories: [] };
    acc[story.authorId].stories.push(story);
    return acc;
  }, {});

  return (
    <>
      {/* Story Bar */}
      <div className="bg-white dark:bg-dark-900 border border-gray-200 dark:border-white/[0.08] rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.2)]">
        <div ref={scrollRef} className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
          {/* My Story */}
          <div className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer" onClick={() => fileRef.current?.click()}>
            <div className="relative">
              <UserAvatar user={user} size="lg" />
              <div className="absolute -bottom-0.5 -right-0.5 bg-primary-600 rounded-full p-0.5 border-2 border-white dark:border-dark-900">
                <HiPlus className="text-[10px] text-white" />
              </div>
            </div>
            <span className="text-[11px] text-gray-600 dark:text-gray-400 w-16 text-center truncate">Your Story</span>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleCreateStory} className="hidden" />
          </div>
          {Object.values(groupedStories).map((group: any) => (
            <div key={group.author.id} className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer" onClick={() => openStory(group.stories[0])}>
              <div className="bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 rounded-full p-[2.5px]">
                <div className="bg-white dark:bg-dark-900 rounded-full p-[2px]">
                  <UserAvatar user={group.author} size="lg" />
                </div>
              </div>
              <span className="text-[11px] text-gray-500 dark:text-gray-400 w-14 text-center truncate">{group.author.name.split(" ")[0]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Story Viewer Modal */}
      {viewingStory && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4" onClick={() => { setViewingStory(null); setShowComments(false); }}>
          <div className="relative w-full max-w-md h-[85vh] rounded-2xl overflow-hidden bg-black" onClick={(e) => e.stopPropagation()}>
            {/* Story Image */}
            {(() => {
              const imgs = getStoryImages(viewingStory);
              const src = imgs[currentImageIndex];
              return src ? <img src={src} alt="" className="w-full h-full object-cover" /> : (
                <div className="w-full h-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center"><span className="text-white text-6xl">📖</span></div>
              );
            })()}

            {/* Top overlay: avatar + name + progress + close */}
            <div className="absolute top-0 left-0 right-0 p-4 pb-6 bg-gradient-to-b from-black/70 via-black/30 to-transparent">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <UserAvatar user={viewingStory.author} size="md" />
                  <div>
                    <p className="font-semibold text-sm text-white">{viewingStory.author.name}</p>
                    <p className="text-xs text-gray-300">@{viewingStory.author.username}</p>
                  </div>
                </div>
                <button onClick={() => { setViewingStory(null); setShowComments(false); }} className="p-2 rounded-full bg-black/30 hover:bg-black/50 transition-colors">
                  <HiX className="w-5 h-5 text-white" />
                </button>
              </div>
              {/* Progress bars */}
              <div className="flex gap-1">
                {getStoryImages(viewingStory).map((_: any, i: number) => (
                  <div key={i} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
                    <div className={"h-full bg-white rounded-full transition-all duration-500 " + (i < currentImageIndex ? "w-full" : i === currentImageIndex ? "w-full" : "w-0")} />
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom overlay: like + comment + share */}
            <div className="absolute bottom-0 left-0 right-0 p-4 pt-8 bg-gradient-to-t from-black/70 via-black/30 to-transparent">
              <div className="flex items-center gap-4 mb-3">
                <button onClick={handleLike} className="flex items-center gap-1.5 transition-transform active:scale-90">
                  <HiHeart className={"w-7 h-7 " + (isLiked ? "text-red-500 fill-red-500" : "text-white")} />
                  {likeCount > 0 && <span className="text-sm font-medium text-white">{likeCount}</span>}
                </button>
                <button onClick={() => { setShowComments(!showComments); setTimeout(() => commentInputRef.current?.focus(), 100); }} className="flex items-center gap-1.5">
                  <span className="text-xl text-white">💬</span>
                  {comments.length > 0 && <span className="text-sm font-medium text-white">{comments.length}</span>}
                </button>
                <button className="flex items-center gap-1.5">
                  <HiPaperAirplane className="w-6 h-6 text-white rotate-45" />
                </button>
              </div>

              {/* Comments panel */}
              {showComments && (
                <div className="bg-black/40 rounded-xl p-3 max-h-48 overflow-y-auto backdrop-blur-sm">
                  {comments.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-2">No comments yet</p>
                  ) : (
                    <div className="space-y-2">
                      {comments.map((c: any) => (
                        <div key={c.id} className="flex items-start gap-2">
                          <UserAvatar user={c.user} size="sm" />
                          <div>
                            <p className="text-xs font-semibold text-white">{c.user.name}</p>
                            <p className="text-xs text-gray-300">{c.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/10">
                    <input ref={commentInputRef} type="text" value={comment} onChange={(e) => setComment(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleComment()}
                      placeholder="Add a comment..." className="flex-1 bg-white/10 rounded-full px-3 py-1.5 text-xs text-white placeholder-gray-400 outline-none" />
                    <button onClick={handleComment} disabled={!comment.trim()} className="text-primary-400 disabled:text-gray-500 font-semibold text-xs">Post</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
