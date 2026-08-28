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

  // Listen for real-time notifications
  useSocketEvent("new-notification", () => {
    setUnread((prev) => prev + 1);
  }, []);

  const navItems = [
    { href: "/feed", icon: HiHome, label: "Home" },
    { href: "/explore", icon: HiSearch, label: "Explore" },
    { href: "/messages", icon: HiChat, label: "Messages" },
    { href: "/notifications", icon: HiBell, label: "Notifications", badge: unread },
    { href: "/create", icon: HiPlusCircle, label: "Create" },
    { href: `/profile/${(session?.user as any)?.username}`, icon: HiUser, label: "Profile" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/feed" className="flex items-center gap-2 text-2xl font-bold text-gradient hidden md:block">
          <HiAcademicCap className="text-2xl" />
          CampusConnect
        </Link>

        {/* Mobile: show logo centered, Desktop: show logo left */}
        <Link href="/feed" className="flex items-center gap-2 text-2xl font-bold text-gradient md:hidden">
          <HiAcademicCap className="text-2xl" />
          <span className="text-lg">CampusConnect</span>
        </Link>

        <div className="hidden md:flex items-center gap-1 md:gap-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all ${
                  isActive ? "text-primary-400" : "text-gray-400 hover:text-white"
                }`}
              >
                <item.icon className="text-2xl" />
                <span className="text-[10px] hidden md:block">{item.label}</span>
                {item.badge ? (
                  <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                    {item.badge > 9 ? "9+" : item.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>

        {/* Desktop only: logout button */}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="hidden md:block text-gray-400 hover:text-red-400 transition-colors p-2 rounded-xl hover:bg-white/5"
          title="Sign Out"
        >
          <HiLogout className="text-xl" />
        </button>


      </div>
    </nav>
  );
}
