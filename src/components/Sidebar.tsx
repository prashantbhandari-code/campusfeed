"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/lib/appwrite-session";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useTheme } from "@/components/ThemeProvider";
import { HiAcademicCap, HiCog, HiOutlineCalendar, HiOutlineHome, HiOutlineSearch, HiOutlineBell, HiOutlineChat, HiOutlineUser, HiOutlineAcademicCap, HiOutlineCog } from "react-icons/hi";

export default function Sidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();
    const user = session?.user as any;
  const [unreadCount, setUnreadCount] = useState(0);

  const menuItems = [
    { href: "/feed", icon: HiOutlineHome, label: "Home" },
    { href: "/explore", icon: HiOutlineSearch, label: "Explore" },
    { href: "/messages", icon: HiOutlineChat, label: "Messages" },
    { href: "/notifications", icon: HiOutlineBell, label: "Notifications" },
    { href: "/events", icon: HiOutlineCalendar, label: "Events" },
    { href: "/lms", icon: HiOutlineAcademicCap, label: "Learning" },
    { href: `/profile/${user?.username}`, icon: HiOutlineUser, label: "Profile" },
    { href: "/settings", icon: HiOutlineCog, label: "Settings" },
  ];

  const adminItems = user?.role === 'admin' ? [
    { href: "/admin", icon: HiCog, label: "Admin Panel", badge: '👑' },
  ] : [];

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await fetch("/api/messages");
        const data = await res.json();
        const count = data.reduce((acc: number, c: any) => acc + (c.unreadCount || 0), 0);
        setUnreadCount(count);
      } catch (error) { console.error("Operation failed:", error); }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 flex-col p-4 border-r border-gray-200 dark:border-white/[0.06] bg-white dark:bg-dark-900 z-40">
      <Link href="/feed" className="flex items-center gap-3 px-4 py-3 mb-4 hover:opacity-80 transition-opacity">
        <HiAcademicCap className="text-2xl text-campus-400 flex-shrink-0" />
        <span className="text-xl font-bold text-gradient">CampusConnect</span>
      </Link>
      <div className="space-y-0.5">
        {menuItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all relative ${
                isActive
                  ? "bg-primary-600/10 text-primary-500 dark:text-primary-400 font-semibold after:absolute after:left-0 after:top-1/2 after:-translate-y-1/2 after:w-[3px] after:h-5 after:bg-primary-500 after:rounded-r-full"
                  : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/[0.04] hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <item.icon className="text-xl flex-shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      {adminItems.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-white/[0.06]">
          <p className="px-4 mb-2 text-xs font-semibold text-purple-400 uppercase tracking-wider">Administration</p>
          {adminItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive
                    ? "bg-purple-600/10 text-purple-500 dark:text-purple-400 font-semibold border-l-2 border-purple-500 -ml-[2px] pl-[18px]"
                    : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/[0.04] hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                <item.icon className="text-xl" />
                <span>{item.label}</span>
                {item.badge && <span className="ml-auto text-sm">{item.badge}</span>}
              </Link>
            );
          })}
        </div>
      )}

      </aside>
  );
}
