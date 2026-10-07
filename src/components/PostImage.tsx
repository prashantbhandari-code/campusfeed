"use client";

import { useState } from "react";
import { HiOutlinePhoto } from "react-icons/hi2";

interface PostImageProps {
  src: string;
  className?: string;
  onClick?: () => void;
}

// Image tile with a graceful fallback: a dead upload (paused storage
// project, deleted file) must not blank out the whole post — it currently
// renders as an empty dark card that looks like the post vanished.
// Images fade in on load instead of popping.
export default function PostImage({ src, className = "", onClick }: PostImageProps) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  if (failed) {
    return (
      <div
        className={
          "flex flex-col items-center justify-center gap-2 bg-gray-100 dark:bg-dark-800 text-gray-400 dark:text-gray-500 " +
          className
        }
      >
        <HiOutlinePhoto className="w-10 h-10" />
        <span className="text-xs font-medium">Image unavailable</span>
      </div>
    );
  }

  const attach = (el: HTMLImageElement | null) => {
    // Cached images can finish loading before React attaches onLoad
    if (el?.complete && el.naturalWidth > 0) setLoaded(true);
  };

  return (
    <img
      ref={attach}
      src={src}
      alt=""
      className={className + " transition-opacity duration-300 " + (loaded ? "opacity-100" : "opacity-0")}
      loading="lazy"
      onLoad={() => setLoaded(true)}
      onError={() => setFailed(true)}
      onClick={onClick}
    />
  );
}
