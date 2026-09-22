"use client";
import React from "react";

import { useSession, signOutAppwrite as signOut } from "@/lib/appwrite-session";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  HiOutlineArrowLeft, HiOutlineCog, HiOutlineArrowRightOnRectangle,
  HiOutlineBookmark, HiOutlineArchiveBox, HiOutlineClock,
  HiOutlineShieldCheck, HiOutlineNoSymbol, HiOutlineUserCircle,
  HiOutlineBell, HiOutlineEyeSlash, HiOutlineQuestionMarkCircle,
  HiOutlineInformationCircle, HiOutlineChevronRight,
  HiOutlineMoon, HiOutlineSun, HiOutlineLanguage,
  HiOutlineDocumentText, HiOutlineFlag,
} from "react-icons/hi2";
import { useTheme } from "@/components/ThemeProvider";
import toast from "react-hot-toast";
import { usePushNotifications } from "@/lib/usePushNotifications";

const MENU_SECTIONS = [
  {
    title: "Your Account",
    items: [
      { label: "Account Center", description: "Manage your personal information", icon: HiOutlineUserCircle, href: "/profile/me" },
      { label: "Saved", description: "Posts you saved", icon: HiOutlineBookmark, href: "/saved" },
      { label: "Archive", description: "Your archived posts and stories", icon: HiOutlineArchiveBox, href: "/archive" },
    ],
  },
  {
    title: "Preferences",
    items: [
      { label: "Notifications", description: "Control push and in-app alerts", icon: HiOutlineBell, href: "/notifications" },
      { label: "Time Management", description: "Set daily reminders and usage limits", icon: HiOutlineClock, href: "/settings/time" },
      { label: "Language", description: "English (US)", icon: HiOutlineLanguage, href: "/settings/language" },
    ],
  },
  {
    title: "Privacy & Security",
    items: [
      { label: "Account Privacy", description: "Make your account private", icon: HiOutlineShieldCheck, href: "/settings/privacy" },
      { label: "Blocked Accounts", description: "Manage blocked users", icon: HiOutlineNoSymbol, href: "/settings/blocked" },
      { label: "Hide Story & Live", description: "Control who sees your content", icon: HiOutlineEyeSlash, href: "/settings/hide" },
    ],
  },
  {
    title: "Support & About",
    items: [
      { label: "Help Center", description: "Get help with CampusConnect", icon: HiOutlineQuestionMarkCircle, href: "/help" },
      { label: "Report a Problem", description: "Let us know about issues", icon: HiOutlineFlag, href: "/report" },
      { label: "Terms & Policies", description: "Terms of service and privacy policy", icon: HiOutlineDocumentText, href: "/terms" },
      { label: "About", description: "CampusConnect v1.0 for KIIT University", icon: HiOutlineInformationCircle, href: "/about" },
    ],
  },
];


function PushNotificationToggle() {
  const { isSubscribed, loading, subscribe, unsubscribe, checkSubscription } = usePushNotifications();
  
  React.useEffect(() => { checkSubscription(); }, [checkSubscription]);
  
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-900 dark:text-white">Enable Push Notifications</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {isSubscribed ? "You will receive push notifications" : "Notifications are disabled"}
        </p>
      </div>
      <button
        onClick={() => isSubscribed ? unsubscribe() : subscribe()}
        disabled={loading}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          isSubscribed ? "bg-primary-600" : "bg-gray-300 dark:bg-gray-600"
        } ${loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          isSubscribed ? "translate-x-6" : "translate-x-1"
        }`} />
      </button>
    </div>
  );
}


export default function SettingsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-all">
          <HiOutlineArrowLeft className="text-xl text-gray-600 dark:text-gray-400" />
        </button>
        <div className="flex items-center gap-2">
          <HiOutlineCog className="text-xl text-gray-900 dark:text-white" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Settings</h1>
        </div>
      </div>

      <button onClick={toggleTheme} className="w-full flex items-center justify-between p-4 glass-card rounded-2xl mb-4 hover-lift transition-all">
        <div className="flex items-center gap-3">
          {theme === "dark" ? <HiOutlineSun className="text-xl text-yellow-500" /> : <HiOutlineMoon className="text-xl text-blue-500" />}
          <div className="text-left">
            <p className="font-medium text-gray-900 dark:text-white">Appearance</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Currently {theme === "dark" ? "Dark" : "Light"} Mode</p>
          </div>
        </div>
        <HiOutlineChevronRight className="text-gray-400" />
      </button>

      {MENU_SECTIONS.map((section) => (
        <div key={section.title} className="mb-4">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider px-1 mb-2">{section.title}</h3>
          <div className="glass-card rounded-2xl overflow-hidden divide-y divide-gray-100 dark:divide-white/[0.04]">
            {section.items.map((item) => (
              <Link key={item.label} href={item.href} className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-all">
                <item.icon className="text-xl text-gray-500 dark:text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-900 dark:text-white">{item.label}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-400 truncate">{item.description}</p>
                </div>
                <HiOutlineChevronRight className="text-gray-300 dark:text-gray-600 flex-shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      ))}


      {/* Push Notifications */}
      <div className="mb-4">
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider px-1 mb-2">Push Notifications</h3>
        <div className="glass-card rounded-2xl p-4">
          <PushNotificationToggle />
        </div>
      </div>
      <div className="mb-4">
        
      <button onClick={() => { signOut(); toast.success("Signed out"); }} className="w-full flex items-center justify-center gap-2 p-4 bg-white dark:bg-dark-800 border border-red-200 dark:border-red-500/20 rounded-2xl hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors shadow-sm dark:shadow-none">
          <HiOutlineArrowRightOnRectangle className="text-lg text-red-500" />
          <span className="font-medium text-red-500">Log Out</span>
        </button>
      </div>

      <p className="text-center text-xs text-gray-300 dark:text-gray-600 pb-20">CampusConnect v1.0 for KIIT University</p>
    </div>
  );
}