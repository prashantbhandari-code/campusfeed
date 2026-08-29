"use client";

import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import { HiBell, HiLogout, HiAcademicCap, HiSun, HiMoon } from "react-icons/hi";
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
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-gray-200 dark:border-white/10 bg-white dark:bg-dark-900/90 md:hidden">
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
              pathname === "/notifications" ? "text-primary-400" : "text-gray-500 dark:text-gray-400"
            }`}
          >
            <HiBell className="text-xl" />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </Link>

          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-gray-500 dark:text-gray-400 hover:text-red-400 p-2 rounded-xl"
            title="Sign Out"
          >
            <HiLogout className="text-xl" />
          </button>
        </div>
      </div>
    </nav>
  );
}
