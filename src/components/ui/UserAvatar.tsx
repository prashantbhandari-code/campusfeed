"use client";

import { getInitials, generateAvatarColor } from "@/lib/utils";
import Image from "next/image";
import { useState } from "react";

interface UserAvatarProps {
  user: { name: string; avatar?: string | null; username?: string };
  size?: "sm" | "md" | "lg" | "xl";
  showStory?: boolean;
  hasStory?: boolean;
  isOnline?: boolean;
}

const sizeClasses = {
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-12 h-12 text-base",
  xl: "w-20 h-20 text-2xl",
};

const ringSize = {
  sm: "w-10 h-10",
  md: "w-12 h-12",
  lg: "w-14 h-14",
  xl: "w-24 h-24",
};

const onlineDotSize = {
  sm: "w-2.5 h-2.5 border",
  md: "w-3 h-3 border-2",
  lg: "w-3.5 h-3.5 border-2",
  xl: "w-4 h-4 border-2",
};

export default function UserAvatar({ user, size = "md", showStory = false, hasStory = false, isOnline }: UserAvatarProps) {
  const initials = getInitials(user.name);
  const colorClass = generateAvatarColor(user.name);
  const [failed, setFailed] = useState(false);

  const avatar = user.avatar && !failed ? (
    <Image
      src={user.avatar}
      alt={user.name}
      width={80}
      height={80}
      onError={() => setFailed(true)}
      className={`${sizeClasses[size]} rounded-full object-cover`}
    />
  ) : (
    <div className={`${sizeClasses[size]} ${colorClass} rounded-full flex items-center justify-center font-bold`}>
      {initials}
    </div>
  );

  if (showStory) {
    return (
      <div className={`${hasStory ? "story-gradient" : "bg-gray-300 dark:bg-dark-500"} ${ringSize[size]} rounded-full p-0.5 flex items-center justify-center`}>
        <div className="bg-white dark:bg-dark-900 rounded-full p-0.5">
          {avatar}
        </div>
      </div>
    );
  }

  return (
    <div className="relative inline-block">
      {avatar}
      {isOnline && (
        <span className={`absolute bottom-0 right-0 ${onlineDotSize[size]} bg-green-400 border-white dark:border-dark-900 rounded-full`} />
      )}
    </div>
  );
}
