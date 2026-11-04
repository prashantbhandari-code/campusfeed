"use client";

import { useSession } from "@/lib/auth/session";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { HiHome, HiUser, HiUserGroup, HiOutlineUserGroup, HiInformationCircle } from "react-icons/hi2";
import { useUnreadMessages } from "@/lib/notifications/useUnreadMessages";
import { useUnreadGroups } from "@/lib/notifications/useUnreadGroups";
import { messagesHref, isNavActive } from "@/lib/chat/messages-inbox";

export default function BottomNav() {
  const { data: session } = useSession();
  const unreadMessages = useUnreadMessages();
  const unreadGroups = useUnreadGroups(session?.user?.id);
  const pathname = usePathname();
  const user = session?.user;
  const router = useRouter();

  // The five slots: Home, Messages, Info, Profile, Groups. Search moved to
  // the TOP (this navbar's sibling TopSearch on mobile, the sticky bar above
  // the content column on desktop), so Explore and Events lost their bottom
  // slots — Events stays reachable from the desktop sidebar and the new
  // /info page, Explore from the top search bar and the sidebar.
  //
  // Group CHAT unread still rides the Messages badge (not the Groups badge):
  // groups landing in /groups is the discovery list, while the conversations
  // live in /messages — so messagesHref keeps opening the Groups section when
  // that's all that's new, and the badge never leads to a page without it.
  // Each item takes an equal share of the bar (flex-1) with min-w-0 so
  // nothing overflows on 360px-wide phones.
  const navItems = [
    { href: "/feed", icon: HiHome, label: "Home", unread: 0 },
    // icon kept for a uniform tuple type; the isMessages branch draws its own SVG.
    { href: messagesHref(unreadMessages, unreadGroups), icon: HiOutlineUserGroup, label: "Messages", isMessages: true, unread: unreadMessages + unreadGroups },
    { href: "/info", icon: HiInformationCircle, label: "Info", unread: 0 },
    { href: `/profile/${user?.username}`, icon: HiUser, label: "Profile", unread: 0 },
    { href: "/groups", icon: HiUserGroup, label: "Groups", unread: 0 },
  ];

  const Badge = ({ count }: { count: number }) =>
    count > 0 ? (
      <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[16px] px-1 text-center leading-4">
        {count > 9 ? "9+" : count}
      </span>
    ) : null;

  return (
    <nav
      aria-label="Primary"
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bottom-nav rounded-none border-t border-white/[0.08] dark:border-white/[0.06] safe-area-bottom"
    >
      <div className="flex items-center h-16 px-2">
        {navItems.map((item) => {
          const isActive = isNavActive(pathname, item.href);
          const itemClass = `flex flex-col items-center gap-0.5 flex-1 min-w-0 px-1 py-1.5 rounded-xl transition-all ${
            isActive ? "text-primary-500 dark:text-primary-400" : "text-gray-400 dark:text-gray-500"
          }`;

          if (item.isMessages) {
            return (
              <button key={item.href.split("?")[0]} onClick={() => router.push(item.href)} className={itemClass}>
                <div className="relative">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 2L11 13" />
                    <path d="M22 2L15 22L11 13L2 9L22 2Z" />
                  </svg>
                  <Badge count={item.unread} />
                </div>
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            );
          }

          return (
            <Link key={item.href.split("?")[0]} href={item.href} className={itemClass}>
              <div className="relative">
                <item.icon className={`text-xl ${isActive ? "text-primary-500 dark:text-primary-400" : ""}`} />
                <Badge count={item.unread} />
              </div>
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
