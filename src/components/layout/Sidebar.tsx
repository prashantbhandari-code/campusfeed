"use client";

import { useSession } from "@/lib/auth/session";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useTheme } from "@/components/providers/ThemeProvider";
import { useUnreadNotifications } from "@/lib/notifications/useUnreadNotifications";
import { useUnreadMessages } from "@/lib/notifications/useUnreadMessages";
import { useUnreadGroups } from "@/lib/notifications/useUnreadGroups";
import { messagesHref, isNavActive } from "@/lib/chat/messages-inbox";
import { HiAcademicCap, HiCog, HiOutlineCalendar, HiOutlineHome, HiOutlineSearch, HiOutlineBell, HiOutlineChat, HiOutlineUser, HiOutlineAcademicCap, HiOutlineCog, HiOutlineDocumentText } from "react-icons/hi";

export default function Sidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();
    const user = session?.user;
  const unreadCount = useUnreadMessages();
  const unreadGroups = useUnreadGroups(user?.id);
  const notifUnread = useUnreadNotifications();
  // Groups has no nav entry of its own — it's a tab inside Messages, so the
  // Messages badge is the inbox total: DMs + group messages.
  const inboxTotal = unreadCount + unreadGroups;

  const Badge = ({ count }: { count: number }) =>
    count > 0 ? (
      <span className="ml-auto text-[10px] font-bold bg-red-500 text-white rounded-full min-w-[18px] px-1 flex items-center justify-center">
        {count > 9 ? "9+" : count}
      </span>
    ) : null;

  const menuItems = [
    { href: "/feed", icon: HiOutlineHome, label: "Home" },
    { href: "/explore", icon: HiOutlineSearch, label: "Explore" },
    // Group-only unread opens the Groups section directly, since Chats would
    // be empty and the badge would have led nowhere.
    { href: messagesHref(unreadCount, unreadGroups), icon: HiOutlineChat, label: "Messages" },
    { href: "/blogs", icon: HiOutlineDocumentText, label: "Blogs" },
    { href: "/notifications", icon: HiOutlineBell, label: "Notifications" },
    { href: "/events", icon: HiOutlineCalendar, label: "Events" },
    { href: "/lms", icon: HiOutlineAcademicCap, label: "Learning" },
    { href: `/profile/${user?.username}`, icon: HiOutlineUser, label: "Profile" },
    { href: "/settings", icon: HiOutlineCog, label: "Settings" },
  ];

  const adminItems = user?.role === 'admin' ? [
    { href: "/admin", icon: HiCog, label: "Admin Panel", badge: '👑' },
  ] : [];

  return (
    <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 flex-col p-4 border-r border-white/[0.06] glass-card rounded-none z-40">
      <Link href="/feed" className="flex items-center gap-3 px-4 py-3 mb-4 hover:opacity-80 transition-opacity">
        <HiAcademicCap className="text-2xl text-campus-400 flex-shrink-0" />
        <span className="text-xl font-bold text-gradient">Campusfeed</span>
      </Link>
      <div className="space-y-0.5">
        {menuItems.map((item) => {
          const isActive = isNavActive(pathname, item.href);
          return (
            <Link
              key={item.href.split("?")[0]}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all relative ${
                isActive
                  ? "bg-primary-500/15 text-primary-400 font-semibold after:absolute after:left-0 after:top-1/2 after:-translate-y-1/2 after:w-[3px] after:h-5 after:bg-primary-400 after:rounded-r-full"
                  : "text-gray-400 hover:bg-white/[0.06] hover:text-white"
              }`}
            >
              <item.icon className="text-xl flex-shrink-0" />
              <span>{item.label}</span>
              {item.href === "/messages" && <Badge count={inboxTotal} />}
              {item.href === "/notifications" && <Badge count={notifUnread} />}
            </Link>
          );
        })}
      </div>

      {adminItems.length > 0 && (
        <div className="mt-4 pt-4 border-t border-white/[0.06]">
          <p className="px-4 mb-2 text-xs font-semibold text-purple-400 uppercase tracking-wider">Administration</p>
          {adminItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive
                    ? "bg-purple-600/15 text-purple-400 font-semibold after:absolute after:left-0 after:top-1/2 after:-translate-y-1/2 after:w-[3px] after:h-5 after:bg-purple-400 after:rounded-r-full"
                    : "text-gray-400 hover:bg-white/[0.06] hover:text-white"
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
