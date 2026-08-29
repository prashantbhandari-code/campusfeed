"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { HiHome, HiBell, HiUser, HiOutlineUserGroup, HiPencilSquare, HiArrowsPointingOut } from "react-icons/hi2"
import { HiSearch } from "react-icons/hi";

function MessagesIcon({ conversations }: { conversations: any[] }) {
  const router = useRouter();
  const recentAvatars = conversations.slice(0, 2).map((c) => c.otherUser);

  return (
    <button
      onClick={() => router.push("/messages")}
      className="flex flex-col items-center gap-0.5 px-3 py-1.5"
    >
      <div className="relative">
        {/* Paper plane icon */}
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 2L11 13" />
          <path d="M22 2L15 22L11 13L2 9L22 2Z" />
        </svg>
        {/* Stacked avatars */}
        {recentAvatars.length > 0 && (
          <div className="absolute -top-1 -right-3 flex -space-x-1.5">
            {recentAvatars.slice(0, 2).map((u: any, i: number) => (
              <div
                key={u.id}
                className="w-4 h-4 rounded-full border border-dark-900 bg-dark-600 overflow-hidden"
                style={{ zIndex: 2 - i }}
              >
                {u.avatar ? (
                  <img src={u.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-primary-600 flex items-center justify-center text-[6px] text-white font-bold">
                    {u.name?.charAt(0)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <span className="text-[10px] font-medium">Messages</span>
    </button>
  );
}

export default function BottomNav() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const user = session?.user as any;
  const [conversations, setConversations] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/messages")
      .then((r) => r.json())
      .then((d) => setConversations(d))
      .catch(() => {});
  }, []);

  const navItems = [
    { href: "/feed", icon: HiHome, label: "Home" },
    { href: "/explore", icon: HiSearch, label: "Search" },
    { href: "/groups", icon: HiOutlineUserGroup, label: "Groups" },
    { href: "/notifications", icon: HiBell, label: "Alerts" },
    { href: `/profile/${user?.username}`, icon: HiUser, label: "Profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden glass border-t border-white/10 safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.slice(0, 3).map((item) => {
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

        {/* Messages with stacked avatars */}
        <div className={pathname === "/messages" || pathname.startsWith("/messages/") ? "text-primary-400" : "text-gray-500"}>
          <MessagesIcon conversations={conversations} />
        </div>

        {navItems.slice(3).map((item) => {
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
