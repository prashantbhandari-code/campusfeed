"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HiHome, HiSearch, HiBell, HiChat, HiPlusCircle, HiUser, HiLogout, HiAcademicCap } from "react-icons/hi";
import { signOut } from "next-auth/react";

export default function Sidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const user = session?.user as any;

  const menuItems = [
    { href: "/feed", icon: HiHome, label: "Home" },
    { href: "/explore", icon: HiSearch, label: "Explore" },
    { href: "/messages", icon: HiChat, label: "Messages" },
    { href: "/notifications", icon: HiBell, label: "Notifications" },
    { href: "/create", icon: HiPlusCircle, label: "Create Post" },
    { href: `/profile/${user?.username}`, icon: HiUser, label: "Profile" },
  ];

  return (
    <aside className="hidden md:flex fixed left-0 top-16 bottom-0 w-64 flex-col p-4 border-r border-white/5">
      <div className="flex items-center gap-2 px-4 py-4 mb-2">
        <HiAcademicCap className="text-2xl text-campus-400" />
        <span className="text-xl font-bold text-gradient">CampusConnect</span>
      </div>
      <div className="flex-1 space-y-1">
        {menuItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                isActive
                  ? "bg-primary-600/20 text-primary-400 font-semibold"
                  : "text-gray-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <item.icon className="text-xl" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      <div className="border-t border-white/5 pt-4">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-all w-full"
        >
          <HiLogout className="text-xl" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
