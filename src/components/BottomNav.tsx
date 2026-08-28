"use client";

import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { HiHome, HiSearch, HiChat, HiBell, HiUser, HiOutlineUserGroup } from "react-icons/hi";

export default function BottomNav() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const user = session?.user as any;

  const navItems = [
    { href: "/feed", icon: HiHome, label: "Home" },
    { href: "/explore", icon: HiSearch, label: "Search" },
    { href: "/groups", icon: HiOutlineUserGroup, label: "Groups" },
    { href: "/messages", icon: HiChat, label: "Chat" },
    { href: "/notifications", icon: HiBell, label: "Alerts" },
    { href: `/profile/${user?.username}`, icon: HiUser, label: "Profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden glass border-t border-white/10 safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all min-w-[48px] ${
                isActive ? "text-primary-400" : "text-gray-500"
              }`}
            >
              <item.icon className={`text-xl ${isActive ? "text-primary-400" : ""}`} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
