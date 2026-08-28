"use client";

import { getInitials, generateAvatarColor } from "@/lib/utils";
import Image from "next/image";

interface UserAvatarProps {
  user: { name: string; avatar?: string | null; username?: string };
  size?: "sm" | "md" | "lg" | "xl";
  showStory?: boolean;
  hasStory?: boolean;
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

export default function UserAvatar({ user, size = "md", showStory = false, hasStory = false }: UserAvatarProps) {
  const initials = getInitials(user.name);
  const colorClass = generateAvatarColor(user.name);

  const avatar = user.avatar ? (
    <Image
      src={user.avatar}
      alt={user.name}
      width={80}
      height={80}
      className={`${sizeClasses[size]} rounded-full object-cover`}
    />
  ) : (
    <div className={`${sizeClasses[size]} ${colorClass} rounded-full flex items-center justify-center font-bold`}>
      {initials}
    </div>
  );

  if (showStory) {
    return (
      <div className={`${hasStory ? "story-gradient" : "bg-dark-500"} ${ringSize[size]} rounded-full p-0.5 flex items-center justify-center`}>
        <div className="bg-dark-900 rounded-full p-0.5">
          {avatar}
        </div>
      </div>
    );
  }

  return avatar;
}
