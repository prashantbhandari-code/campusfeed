"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import { HiHome, HiSearch, HiBell, HiChat, HiPlusCircle, HiUser, HiLogout, HiAcademicCap } from "react-icons/hi";
import { useSocket, useSocketEvent } from "@/lib/useSocket";

export default function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);
  const user = session?.user as any;

  useSocket(user?.id);

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

  // Mobile nav items (bottom nav handles mobile, so navbar only shows logo + minimal)
  // Desktop nav: only notifications, profile, sign out — sidebar handles main nav
  return (
    <>
      {/* Desktop Navbar — minimal: logo left, profile + signout right */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/10 hidden md:block">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/feed" className="flex items-center gap-2 text-2xl font-bold text-gradient">
            <HiAcademicCap className="text-2xl" />
            CampusConnect
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/notifications"
              className={`relative flex items-center gap-1 px-3 py-2 rounded-xl transition-all ${
                pathname === "/notifications" ? "text-primary-400" : "text-gray-400 hover:text-white"
              }`}
            >
              <HiBell className="text-xl" />
              {unread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Link>

            <Link
              href={`/profile/${user?.username}`}
              className={`flex items-center gap-1 px-3 py-2 rounded-xl transition-all ${
                pathname.startsWith("/profile") ? "text-primary-400" : "text-gray-400 hover:text-white"
              }`}
            >
              <HiUser className="text-xl" />
            </Link>

            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-gray-400 hover:text-red-400 transition-colors p-2 rounded-xl hover:bg-white/5"
              title="Sign Out"
            >
              <HiLogout className="text-xl" />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Navbar — logo only, BottomNav handles navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/10 md:hidden">
        <div className="px-4 h-14 flex items-center justify-between">
          <Link href="/feed" className="flex items-center gap-2 text-xl font-bold text-gradient">
            <HiAcademicCap className="text-xl" />
            CampusConnect
          </Link>

          <div className="flex items-center gap-1">
            <Link
              href="/notifications"
              className={`relative p-2 rounded-xl transition-all ${
                pathname === "/notifications" ? "text-primary-400" : "text-gray-400"
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
              className="text-gray-400 hover:text-red-400 p-2 rounded-xl"
              title="Sign Out"
            >
              <HiLogout className="text-xl" />
            </button>
          </div>
        </div>
      </nav>
    </>
  );
}
