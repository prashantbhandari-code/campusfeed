"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HiHome, HiSearch, HiBell, HiChat, HiPlusCircle, HiUser, HiLogout, HiAcademicCap, HiSun, HiMoon, HiCog } from "react-icons/hi";
import { useTheme } from "@/components/ThemeProvider";

export default function Sidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const user = session?.user as any;

  const menuItems = [
    { href: "/feed", icon: HiHome, label: "Home" },
    { href: "/explore", icon: HiSearch, label: "Explore" },
    { href: "/messages", icon: HiChat, label: "Messages" },
    { href: "/notifications", icon: HiBell, label: "Notifications" },
    { href: "/create", icon: HiPlusCircle, label: "Create Post" },
    { href: `/profile/${user?.username}`, icon: HiUser, label: "Profile" },
    { href: "/settings", icon: HiCog, label: "Settings" },
  ];

  return (
    <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 flex-col p-4 border-r border-gray-200 dark:border-white/[0.06] bg-white dark:bg-dark-900 z-40">
      <div className="flex items-center gap-3 px-4 py-6 mb-6">
        <HiAcademicCap className="text-2xl text-campus-400" />
        <span className="text-xl font-bold text-gradient">CampusConnect</span>
      </div>
      <div className="flex-1 space-y-0.5">
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

      <div className="border-t border-gray-200 dark:border-white/[0.06] pt-3 mt-3 space-y-0.5">
        <button
          onClick={toggleTheme}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white transition-all w-full"
        >
          {theme === "dark" ? <HiSun className="text-xl" /> : <HiMoon className="text-xl" />}
          <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
        </button>
        <button
          onClick={() => window.location.href = "/api/auth/signout?callbackUrl=/login"}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-all w-full"
        >
          <HiLogout className="text-xl" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
