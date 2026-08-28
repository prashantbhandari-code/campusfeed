"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import UserAvatar from "./UserAvatar";
import { HiPlus } from "react-icons/hi";
import { parseImages } from "@/lib/utils";
import toast from "react-hot-toast";

export default function StoryBar() {
  const { data: session } = useSession();
  const router = useRouter();
  const user = session?.user as any;
  const [stories, setStories] = useState<any[]>([]);
  const [viewingStory, setViewingStory] = useState<any>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchStories();
  }, []);

  const fetchStories = async () => {
    try {
      const res = await fetch("/api/stories");
      const data = await res.json();
      setStories(data);
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

      await fetch("/api/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: [url] }),
      });
      fetchStories();
      toast.success("Story posted!");
    } catch {
      toast.error("Failed to post story");
    }
  };

  const openStory = (story: any) => {
    setViewingStory(story);
    setCurrentImageIndex(0);
  };

  useEffect(() => {
    if (!viewingStory) return;
    const images = parseImages(viewingStory.images);
    if (images.length <= 1) {
      const timer = setTimeout(() => setViewingStory(null), 5000);
      return () => clearTimeout(timer);
    }
    const timer = setInterval(() => {
      setCurrentImageIndex((prev) => {
        if (prev >= images.length - 1) {
          setViewingStory(null);
          return 0;
        }
        return prev + 1;
      });
    }, 4000);
    return () => clearInterval(timer);
  }, [viewingStory, currentImageIndex]);

  // Group stories by author
  const groupedStories = stories.reduce((acc: any, story: any) => {
    if (!acc[story.authorId]) {
      acc[story.authorId] = { author: story.author, stories: [] };
    }
    acc[story.authorId].stories.push(story);
    return acc;
  }, {});

  return (
    <>
      <div className="glass rounded-2xl p-4 mb-4">
        <div ref={scrollRef} className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
          {/* My Story */}
          <div className="flex flex-col items-center gap-1 flex-shrink-0 cursor-pointer" onClick={() => fileRef.current?.click()}>
            <div className="relative">
              <UserAvatar user={user} size="lg" />
              <div className="absolute -bottom-1 -right-1 bg-primary-600 rounded-full p-1 border-2 border-dark-900">
                <HiPlus className="text-xs" />
              </div>
            </div>
            <span className="text-xs text-gray-400 w-14 text-center truncate">Your Story</span>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleCreateStory} className="hidden" />
          </div>

          {/* Other Stories */}
          {Object.values(groupedStories).map((group: any) => (
            <div
              key={group.author.id}
              className="flex flex-col items-center gap-1 flex-shrink-0 cursor-pointer"
              onClick={() => openStory(group.stories[0])}
            >
              <div className="story-gradient rounded-full p-[2px]">
                <div className="bg-dark-900 rounded-full p-[2px]">
                  <UserAvatar user={group.author} size="lg" />
                </div>
              </div>
              <span className="text-xs text-gray-400 w-14 text-center truncate">{group.author.name.split(" ")[0]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Story Viewer Modal */}
      {viewingStory && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
          onClick={() => setViewingStory(null)}
        >
          <div className="relative w-full max-w-md h-[80vh] rounded-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <img
              src={parseImages(viewingStory.images)[currentImageIndex]}
              alt=""
              className="w-full h-full object-cover"
            />
            <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent">
              <div className="flex items-center gap-3">
                <UserAvatar user={viewingStory.author} size="sm" />
                <div>
                  <p className="font-semibold text-sm">{viewingStory.author.name}</p>
                  <p className="text-xs text-gray-300">@{viewingStory.author.username}</p>
                </div>
              </div>
              {/* Progress bars */}
              <div className="flex gap-1 mt-3">
                {parseImages(viewingStory.images).map((_: any, i: number) => (
                  <div key={i} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-white rounded-full transition-all duration-300 ${
                        i < currentImageIndex ? "w-full" : i === currentImageIndex ? "w-full" : "w-0"
                      }`}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
