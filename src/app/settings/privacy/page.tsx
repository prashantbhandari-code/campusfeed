"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { HiOutlineArrowLeft, HiOutlineShieldCheck, HiOutlineBan, HiOutlineEyeOff, HiOutlineChevronRight, HiOutlineLockClosed, HiOutlineGlobeAlt, HiOutlineKey } from "react-icons/hi";

const FACTS = [
  {
    icon: HiOutlineGlobeAlt,
    title: "Campus-only visibility",
    body: "Your profile, posts, and stories are only visible to signed-in Campusfeed members of your campus. Nothing is shared publicly on the internet.",
  },
  {
    icon: HiOutlineLockClosed,
    title: "Private by default",
    body: "Your contact details are never shown to other students. People only see the name, username, and avatar on your profile.",
  },
  {
    icon: HiOutlineKey,
    title: "You control your content",
    body: "You can edit or delete any of your posts from its ⋮ menu at any time. Deleted content is removed from the feed permanently.",
  },
];

export default function AccountPrivacyPage() {
  const router = useRouter();
  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-all">
          <HiOutlineArrowLeft className="text-xl text-gray-600 dark:text-gray-400" />
        </button>
        <HiOutlineShieldCheck className="text-xl text-gray-900 dark:text-white" />
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Account Privacy</h1>
      </div>

      <div className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-200 dark:border-white/[0.08] divide-y divide-gray-100 dark:divide-white/[0.04] mb-4">
        {FACTS.map((f) => (
          <div key={f.title} className="flex items-start gap-3 px-4 py-3.5">
            <f.icon className="w-5 h-5 shrink-0 mt-0.5 text-primary-600 dark:text-primary-400" />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{f.title}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{f.body}</p>
            </div>
          </div>
        ))}
      </div>

      <Link
        href="/settings/blocked"
        className="flex items-center justify-between px-4 py-3.5 bg-white dark:bg-dark-800 rounded-2xl border border-gray-200 dark:border-white/[0.08] hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-all mb-4"
      >
        <div className="flex items-center gap-3">
          <HiOutlineBan className="w-5 h-5 text-red-500" />
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Blocked Accounts</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Review or unblock people you&apos;ve blocked</p>
          </div>
        </div>
        <HiOutlineChevronRight className="text-gray-400" />
      </Link>

      <Link
        href="/settings/hide"
        className="flex items-center justify-between px-4 py-3.5 bg-white dark:bg-dark-800 rounded-2xl border border-gray-200 dark:border-white/[0.08] hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-all"
      >
        <div className="flex items-center gap-3">
          <HiOutlineEyeOff className="w-5 h-5 text-orange-500" />
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Hide Story &amp; Live</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Control who sees your stories</p>
          </div>
        </div>
        <HiOutlineChevronRight className="text-gray-400" />
      </Link>
    </div>
  );
}
