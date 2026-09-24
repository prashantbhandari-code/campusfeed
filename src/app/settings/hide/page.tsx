"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { HiOutlineArrowLeft, HiOutlineEyeOff, HiOutlineBan, HiOutlineClock, HiOutlineUserGroup, HiOutlineChevronRight } from "react-icons/hi";

const RULES = [
  {
    icon: HiOutlineUserGroup,
    title: "Stories go to your followers",
    body: "Your story is shown to people who follow you, and it disappears automatically after 24 hours — there's nothing to clean up afterwards.",
  },
  {
    icon: HiOutlineClock,
    title: "Nothing is archived publicly",
    body: "When a story expires it's removed. Stories don't end up on your profile grid or in search.",
  },
  {
    icon: HiOutlineBan,
    title: "Blocking is the strongest control",
    body: "If you don't want someone to see anything you share, block them — they lose access to your profile, posts, and stories.",
  },
];

export default function HideStoryLivePage() {
  const router = useRouter();
  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-all">
          <HiOutlineArrowLeft className="text-xl text-gray-600 dark:text-gray-400" />
        </button>
        <HiOutlineEyeOff className="text-xl text-gray-900 dark:text-white" />
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Hide Story &amp; Live</h1>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 px-1 mb-4">
        Here&apos;s how story and live visibility works on Campusfeed today:
      </p>

      <div className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-200 dark:border-white/[0.08] divide-y divide-gray-100 dark:divide-white/[0.04] mb-4">
        {RULES.map((r) => (
          <div key={r.title} className="flex items-start gap-3 px-4 py-3.5">
            <r.icon className="w-5 h-5 shrink-0 mt-0.5 text-primary-600 dark:text-primary-400" />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{r.title}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{r.body}</p>
            </div>
          </div>
        ))}
      </div>

      <Link
        href="/settings/blocked"
        className="flex items-center justify-between px-4 py-3.5 bg-white dark:bg-dark-800 rounded-2xl border border-gray-200 dark:border-white/[0.08] hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-all"
      >
        <div className="flex items-center gap-3">
          <HiOutlineBan className="w-5 h-5 text-red-500" />
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Manage blocked accounts</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Hide everything you share from specific people</p>
          </div>
        </div>
        <HiOutlineChevronRight className="text-gray-400" />
      </Link>
    </div>
  );
}
