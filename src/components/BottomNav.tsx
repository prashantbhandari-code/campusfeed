"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/lib/appwrite-session";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { HiHome, HiUser, HiOutlineUserGroup } from "react-icons/hi2";
import { HiSearch, HiCalendar } from "react-icons/hi";
import { useUnreadMessages } from "@/lib/useUnreadMessages";

export default function BottomNav() {
  const { data: session } = useSession();
  const unreadMessages = useUnreadMessages();
  const pathname = usePathname();
  const user = session?.user as any;
  const router = useRouter();

  const navItems = [
    { href: "/feed", icon: HiHome, label: "Home" },
    { href: "/explore", icon: HiSearch, label: "Search" },
    { href: "/messages", icon: HiOutlineUserGroup, label: "Messages", isMessages: true },
    { href: "/events", icon: HiCalendar, label: "Events" },
    { href: `/profile/${user?.username}`, icon: HiUser, label: "Profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden glass-card rounded-none border-t border-white/[0.08] safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          
          if (item.isMessages) {
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all min-w-[48px] ${
                  isActive ? "text-primary-500 dark:text-primary-400" : "text-gray-400 dark:text-gray-500"
                }`}
              >
                <div className="relative">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 2L11 13" />
                    <path d="M22 2L15 22L11 13L2 9L22 2Z" />
                  </svg>
                  {unreadMessages > 0 && (
                    <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[16px] px-1 text-center leading-4">
                      {unreadMessages > 9 ? "9+" : unreadMessages}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all min-w-[48px] ${
                isActive ? "text-primary-500 dark:text-primary-400" : "text-gray-400 dark:text-gray-500"
              }`}
            >
              <item.icon className={`text-xl ${isActive ? "text-primary-500 dark:text-primary-400" : ""}`} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
