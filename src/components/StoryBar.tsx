"use client";

import { useState, useEffect, useRef, useCallback , memo} from "react";
import { useSession } from "@/lib/appwrite-session";
import UserAvatar from "./UserAvatar";
import { HiPlus, HiHeart, HiPaperAirplane, HiX, HiTrash } from "react-icons/hi";
import toast from "react-hot-toast";
import { useFileUpload } from "@/lib/useFileUpload";

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

function StoryBar() {
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
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const commentInputRef = useRef<HTMLInputElement>(null);
  const { uploadFile, uploading: isUploading } = useFileUpload();
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchStories(controller.signal);
    return () => controller.abort();
  }, []);

  const fetchStories = async (signal?: AbortSignal) => {
    try {
      const res = await fetch("/api/stories", { signal });
      const data = await res.json();
      const valid = data.filter((s: any) => {
        if (!s.images) return false;
        try { const imgs = JSON.parse(s.images); return Array.isArray(imgs) && imgs.some((i: any) => i && typeof i === "string" && i.length > 0); } catch { return false; }
      });
      setStories(valid);
    } catch (error) { console.error("Story operation failed:", error); }
  };

  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1080 }, height: { ideal: 1920 } }, audio: false });
      setCameraStream(stream);
      setShowCamera(true);
      setTimeout(() => { if (videoRef.current) videoRef.current.srcObject = stream; }, 100);
    } catch { toast.error("Camera access denied. Please enable camera in browser settings."); }
  };

  const capturePhoto = async () => {
    if (!videoRef.current || isUploading) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0);
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], "story.jpg", { type: "image/jpeg" });
      const result = await uploadFile(file);
      if (result) {
        await fetch("/api/stories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ images: [result.url] }) });
        fetchStories();
        toast.success("Story posted!");
        closeCamera();
      }
    }, "image/jpeg", 0.9);
  };

  const closeCamera = () => {
    if (cameraStream) cameraStream.getTracks().forEach(t => t.stop());
    setCameraStream(null);
    setShowCamera(false);
  };

  const handleCreateStory = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await uploadFile(file);
    if (result) {
      await fetch("/api/stories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ images: [result.url] }) });
      fetchStories();
      toast.success("Story posted!");
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const openStory = async (story: any) => {
    setViewingStory(story);
    setCurrentImageIndex(0);
    setShowComments(false);
    try {
      const res = await fetch("/api/stories/" + story.id);
      const data = await res.json();
      setStoryData(data);
      setIsLiked(data.isLiked);
      setLikeCount(data.likeCount);
      setComments(data.comments || []);
    } catch (error) { console.error("Story operation failed:", error); }
  };

  const getStoryImages = (story: any): string[] => {
    if (!story?.images) return [];
    let arr: any[];
    if (Array.isArray(story.images)) { arr = story.images; }
    else { try { const p = JSON.parse(story.images); arr = Array.isArray(p) ? p : []; } catch { return []; } }
    return arr.filter((img: any) => img && typeof img === "string" && img.length > 0);
  };

  const groupedStories = stories.reduce((acc: any, story: any) => {
    if (!acc[story.authorId]) acc[story.authorId] = { author: story.author, stories: [] };
    acc[story.authorId].stories.push(story);
    return acc;
  }, {});

  // Tap navigation: left third = prev, right third = advance, middle = pause
  const handleStoryTap = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const third = rect.width / 3;
    const images = getStoryImages(viewingStory);

    if (x < third) {
      // Tap left — go to previous image or previous story
      if (currentImageIndex > 0) {
        setCurrentImageIndex((prev) => prev - 1);
      } else {
        // Go to previous person's story
        const allStories = Object.values(groupedStories) as any[];
        const currentAuthorIdx = allStories.findIndex((g: any) => g.author.id === viewingStory.authorId);
        if (currentAuthorIdx > 0) {
          const prevGroup = allStories[currentAuthorIdx - 1];
          openStory(prevGroup.stories[0]);
        }
      }
    } else if (x > third * 2) {
      // Tap right — advance
      if (currentImageIndex < images.length - 1) {
        setCurrentImageIndex((prev) => prev + 1);
      } else {
        setViewingStory(null);
        setShowComments(false);
      }
    }
    // Middle third does nothing (allows pausing)
  }, [viewingStory, currentImageIndex, groupedStories]);

  const handleLike = async () => {
    if (!viewingStory) return;
    try {
      const res = await fetch("/api/stories/" + viewingStory.id, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "like" }) });
      const data = await res.json();
      setIsLiked(data.liked);
      setLikeCount((prev) => data.liked ? prev + 1 : prev - 1);
    } catch (error) { console.error("Story operation failed:", error); }
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
    } catch (error) { console.error("Story operation failed:", error); }
  };

  const handleDelete = async () => {
    if (!viewingStory) return;
    if (!confirm("Delete this story?")) return;
    try {
      const res = await fetch("/api/stories/" + viewingStory.id, { method: "DELETE" });
      if (res.ok) {
        toast.success("Story deleted");
        setViewingStory(null);
        setShowComments(false);
        fetchStories();
      }
    } catch { toast.error("Failed to delete story"); }
  };

  // Auto-advance timer (5s per image)
  useEffect(() => {
    if (!viewingStory || showComments) return;
    const images = getStoryImages(viewingStory);
    if (images.length <= 1) return;

    timerRef.current = setTimeout(() => {
      setCurrentImageIndex((prev) => {
        if (prev >= images.length - 1) { setViewingStory(null); return 0; }
        return prev + 1;
      });
    }, 5000);

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [viewingStory, currentImageIndex, showComments]);

  // Swipe gestures for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
    setTouchStartY(e.touches[0].clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const dx = e.changedTouches[0].clientX - touchStart;
    const dy = e.changedTouches[0].clientY - (touchStartY || 0);
    const images = getStoryImages(viewingStory);

    // Only process horizontal swipes (ignore vertical)
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) {
        // Swipe left — advance
        if (currentImageIndex < images.length - 1) {
          setCurrentImageIndex((prev) => prev + 1);
        } else {
          setViewingStory(null);
        }
      } else {
        // Swipe right — previous
        if (currentImageIndex > 0) {
          setCurrentImageIndex((prev) => prev - 1);
        }
      }
    }

    // Swipe down to close
    if (dy > 100 && Math.abs(dy) > Math.abs(dx)) {
      setViewingStory(null);
      setShowComments(false);
    }

    setTouchStart(null);
    setTouchStartY(null);
  };

  const isOwnStory = viewingStory && user && viewingStory.authorId === user.id;

  return (
    <>
      {/* Story Bar */}
      <div className="bg-white dark:bg-dark-900 border border-gray-200 dark:border-white/[0.08] rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.2)]">
        <div ref={scrollRef} className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
          {/* My Story */}
          <div className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer group" onClick={() => { const m = confirm("Choose an option:\n\nOK = Take Photo\nCancel = Choose from Gallery"); if (m) openCamera(); else fileRef.current?.click(); }}>
            <div className="relative">
              <UserAvatar user={user} size="lg" />
              <div className="absolute -bottom-0.5 -right-0.5 bg-primary-600 rounded-full p-0.5 border-2 border-white dark:border-dark-900 group-hover:bg-primary-700 transition-colors">
                <HiPlus className="text-[10px] text-white" />
              </div>
            </div>
            <span className="text-[11px] text-gray-600 dark:text-gray-400 w-16 text-center truncate">Your Story</span>
            <label htmlFor="file-upload-story" className="cursor-pointer absolute inset-0"><input id="file-upload-story" ref={fileRef} type="file" accept="image/*" onChange={handleCreateStory} className="sr-only" /></label>
          </div>
          {Object.values(groupedStories).map((group: any) => (
            <div key={group.author.id} className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer" onClick={() => openStory(group.stories[0])}>
              <div className="bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 rounded-full p-[2.5px] hover:scale-105 transition-transform">
                <div className="bg-white dark:bg-dark-900 rounded-full p-[2px]">
                  <UserAvatar user={group.author} size="lg" />
                </div>
              </div>
              <span className="text-[11px] text-gray-500 dark:text-gray-400 w-14 text-center truncate">{group.author.name.split(" ")[0]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Camera Modal */}
      {showCamera && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col">
          <div className="flex items-center justify-between p-4">
            <button onClick={closeCamera} className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
              <HiX className="w-6 h-6 text-white" />
            </button>
            <span className="text-white font-medium text-sm">Your Story</span>
            <div className="w-10" />
          </div>
          <div className="flex-1 flex items-center justify-center px-4">
            <div className="relative w-full max-w-md rounded-2xl overflow-hidden bg-black">
              <video ref={videoRef} autoPlay playsInline muted className="w-full aspect-[9/16] max-h-[70vh] object-cover" />
              {/* Center guide overlay */}
              <div className="absolute inset-0 border-2 border-white/10 rounded-2xl pointer-events-none" />
            </div>
          </div>
          <div className="flex items-center justify-center gap-8 p-6">
            <button onClick={closeCamera} className="p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
              <HiX className="w-6 h-6 text-white" />
            </button>
            <button onClick={capturePhoto} disabled={isUploading} className="relative p-1 rounded-full border-4 border-white hover:border-gray-200 transition-colors">
              <div className={`w-14 h-14 rounded-full bg-white transition-all ${isUploading ? "opacity-50 scale-90" : "hover:bg-gray-100"}`} />
              {isUploading && <div className="absolute inset-0 flex items-center justify-center"><div className="animate-spin rounded-full h-6 w-6 border-2 border-primary-500 border-t-transparent" /></div>}
            </button>
            <button onClick={() => { closeCamera(); fileRef.current?.click(); }} className="p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </button>
          </div>
        </div>
      )}

      {/* Story Viewer Modal */}
      {viewingStory && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
          onClick={() => { setViewingStory(null); setShowComments(false); }}
        >
          <div
            className="relative w-full max-w-md h-full sm:h-[85vh] sm:rounded-2xl overflow-hidden bg-black"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {/* Story Image — tap zones for navigation */}
            <div className="absolute inset-0" onClick={handleStoryTap}>
              {(() => {
                const imgs = getStoryImages(viewingStory);
                const src = imgs[currentImageIndex];
                return src ? (
                  <img src={src} alt="" className="w-full h-full object-cover" draggable={false} />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
                    <span className="text-white text-6xl">📖</span>
                  </div>
                );
              })()}
              {/* Tap zones hint (fades out) */}
              <div className="absolute inset-0 flex pointer-events-none">
                <div className="w-1/3 flex items-center justify-start pl-4 opacity-0 hover:opacity-100 transition-opacity">
                  <div className="bg-black/30 rounded-full p-2"><HiX className="w-5 h-5 text-white -rotate-45" /></div>
                </div>
                <div className="w-1/3" />
                <div className="w-1/3 flex items-center justify-end pr-4 opacity-0 hover:opacity-100 transition-opacity">
                  <div className="bg-black/30 rounded-full p-2"><HiPaperAirplane className="w-5 h-5 text-white -rotate-45" /></div>
                </div>
              </div>
            </div>

            {/* Top overlay: avatar + name + progress + close */}
            <div className="absolute top-0 left-0 right-0 p-3 pb-6 bg-gradient-to-b from-black/80 via-black/40 to-transparent z-10">
              {/* Progress bars */}
              <div className="flex gap-1 mb-3">
                {getStoryImages(viewingStory).map((_: any, i: number) => (
                  <div key={i} className="flex-1 h-[3px] bg-white/30 rounded-full overflow-hidden">
                    <div
                      className={"h-full bg-white rounded-full transition-all " + (i < currentImageIndex ? "w-full duration-0" : i === currentImageIndex && !showComments ? "w-full duration-[5000ms] ease-linear" : i === currentImageIndex ? "w-0" : "w-0")}
                    />
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <UserAvatar user={viewingStory.author} size="md" />
                  <div>
                    <p className="font-semibold text-sm text-white">{viewingStory.author.name}</p>
                    <p className="text-[11px] text-gray-300">{timeAgo(viewingStory.createdAt)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isOwnStory && (
                    <button onClick={handleDelete} className="p-2 rounded-full bg-black/30 hover:bg-red-500/50 transition-colors" title="Delete story">
                      <HiTrash className="w-4 h-4 text-white" />
                    </button>
                  )}
                  <button onClick={() => { setViewingStory(null); setShowComments(false); }} className="p-2 rounded-full bg-black/30 hover:bg-black/50 transition-colors">
                    <HiX className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom overlay: like + comment + share + reply input */}
            <div className="absolute bottom-0 left-0 right-0 p-3 pt-8 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-10">
              <div className="flex items-center gap-4 mb-3">
                <button onClick={(e) => { e.stopPropagation(); handleLike(); }} className="flex items-center gap-1.5 transition-transform active:scale-90">
                  <HiHeart className={"w-7 h-7 " + (isLiked ? "text-red-500 fill-red-500" : "text-white")} />
                  {likeCount > 0 && <span className="text-sm font-medium text-white">{likeCount}</span>}
                </button>
                <button onClick={(e) => { e.stopPropagation(); setShowComments(!showComments); setTimeout(() => commentInputRef.current?.focus(), 100); }} className="flex items-center gap-1.5">
                  <span className="text-xl">💬</span>
                  {comments.length > 0 && <span className="text-sm font-medium text-white">{comments.length}</span>}
                </button>
                <button className="flex items-center gap-1.5">
                  <HiPaperAirplane className="w-6 h-6 text-white rotate-45" />
                </button>
              </div>

              {/* Quick reply bar */}
              {!showComments && (
                <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { handleComment(); setShowComments(false); } }}
                    placeholder="Reply to story..."
                    className="flex-1 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 text-sm text-white placeholder-gray-400 outline-none border border-white/10 focus:border-white/20"
                  />
                  <button onClick={(e) => { e.stopPropagation(); handleComment(); }} disabled={!comment.trim()} className="p-2 rounded-full bg-primary-600 hover:bg-primary-700 disabled:opacity-30 transition-all">
                    <HiPaperAirplane className="w-4 h-4 text-white -rotate-45" />
                  </button>
                </div>
              )}

              {/* Comments panel */}
              {showComments && (
                <div onClick={(e) => e.stopPropagation()} className="bg-black/40 rounded-xl p-3 max-h-48 overflow-y-auto backdrop-blur-sm mt-2">
                  {comments.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-2">No comments yet</p>
                  ) : (
                    <div className="space-y-3">
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

export default memo(StoryBar);
