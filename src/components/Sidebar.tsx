"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HiHome, HiSearch, HiBell, HiChat, HiUser, HiAcademicCap, HiCog, HiOutlineCalendar } from "react-icons/hi";

export default function Sidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();
    const user = session?.user as any;

  const menuItems = [
    { href: "/feed", icon: HiHome, label: "Home" },
    { href: "/explore", icon: HiSearch, label: "Explore" },
    { href: "/messages", icon: HiChat, label: "Messages" },
    { href: "/notifications", icon: HiBell, label: "Notifications" },
    { href: "/events", icon: HiOutlineCalendar, label: "Events" },
    { href: `/profile/${user?.username}`, icon: HiUser, label: "Profile" },
    { href: "/settings", icon: HiCog, label: "Settings" },
  ];

  return (
    <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 flex-col p-4 border-r border-gray-200 dark:border-white/[0.06] bg-white dark:bg-dark-900 z-40">
      <Link href="/feed" className="flex items-center gap-3 px-4 py-6 mb-6 hover:opacity-80 transition-opacity">
        <HiAcademicCap className="text-2xl text-campus-400" />
        <span className="text-xl font-bold text-gradient">CampusConnect</span>
      </Link>
      <div className="space-y-0.5">
        {menuItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                isActive
                  ? "bg-primary-600/10 text-primary-500 dark:text-primary-400 font-semibold border-l-2 border-primary-500 -ml-[2px] pl-[18px]"
                  : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/[0.04] hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <item.icon className="text-xl" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      </aside>
  );
}
