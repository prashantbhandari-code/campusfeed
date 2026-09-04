"use client";

import { useSession, signOutAppwrite as signOut } from "@/lib/appwrite-session";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import { HiBell, HiCog, HiAcademicCap, HiSun, HiMoon } from "react-icons/hi";
import { useSocketEvent } from "@/lib/useSocket";
import { useTheme } from "@/components/ThemeProvider";

export default function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);
  const { theme, toggleTheme } = useTheme();
  const user = session?.user as any;

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await fetch("/api/notifications");
        const data = await res.json();
        setUnread(data.filter((n: any) => !n.read).length);
      } catch {}
    };
    fetchNotifications();
  }, []);

  useSocketEvent("new-notification", () => {
    setUnread((prev) => prev + 1);
  }, []);

  // Desktop: no top navbar (sidebar handles everything)
  // Mobile: logo + theme toggle + bell + sign out
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-gray-200 dark:border-white/[0.08] bg-white/95 dark:bg-dark-900/95 backdrop-blur-xl md:hidden">
      <div className="px-4 h-14 flex items-center justify-between">
        <Link href="/feed" className="flex items-center gap-2 text-xl font-bold text-gradient">
          <HiAcademicCap className="text-xl" />
          CampusConnect
        </Link>

        <div className="flex items-center gap-1">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5"
            title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {theme === "dark" ? <HiSun className="text-xl" /> : <HiMoon className="text-xl" />}
          </button>

          <Link
            href="/notifications"
            className={`relative p-2 rounded-xl transition-all ${
              pathname === "/notifications" ? "text-primary-500 dark:text-primary-400" : "text-gray-500 dark:text-gray-400"
            }`}
          >
            <HiBell className="text-xl" />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] rounded-full min-w-[16px] h-4 flex items-center justify-center font-bold shadow-sm">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </Link>

          <Link
            href="/settings"
            className={`p-2 rounded-xl transition-all ${
              pathname === "/settings" ? "text-primary-500 dark:text-primary-400" : "text-gray-500 dark:text-gray-400"
            }`}
            title="Settings"
          >
            <HiCog className="text-xl" />
          </Link>
        </div>
      </div>
    </nav>
  );
}
