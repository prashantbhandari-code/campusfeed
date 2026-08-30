"use client";

import { useState, useEffect, useCallback } from "react";
import { HiX, HiChevronLeft, HiChevronRight } from "react-icons/hi";

interface LightboxProps {
  images: string[];
  initialIndex?: number;
  onClose: () => void;
}

export default function Lightbox({ images, initialIndex = 0, onClose }: LightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const goNext = useCallback(() => {
    setCurrentIndex((i) => (i + 1) % images.length);
  }, [images.length]);

  const goPrev = useCallback(() => {
    setCurrentIndex((i) => (i - 1 + images.length) % images.length);
  }, [images.length]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose, goNext, goPrev]);

  return (
    <div className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center" onClick={onClose}>
      <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10">
        <HiX className="w-6 h-6 text-white" />
      </button>

      {images.length > 1 && (
        <button onClick={(e) => { e.stopPropagation(); goPrev(); }} className="absolute left-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10">
          <HiChevronLeft className="w-8 h-8 text-white" />
        </button>
      )}

      <img
        src={images[currentIndex]}
        alt=""
        className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg"
        onClick={(e) => e.stopPropagation()}
      />

      {images.length > 1 && (
        <button onClick={(e) => { e.stopPropagation(); goNext(); }} className="absolute right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10">
          <HiChevronRight className="w-8 h-8 text-white" />
        </button>
      )}

      {images.length > 1 && (
        <div className="absolute bottom-4 flex gap-1.5">
          {images.map((_: string, i: number) => (
            <div key={i} className={"w-2 h-2 rounded-full transition-colors " + (i === currentIndex ? "bg-white" : "bg-white/30")} />
          ))}
        </div>
      )}
    </div>
  );
}
