"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { HiOutlineArrowLeft, HiOutlineQuestionMarkCircle, HiOutlineChevronDown } from "react-icons/hi";

const FAQS: { q: string; a: string }[] = [
  {
    q: "How do I create a post?",
    a: "Open the Home feed and use the composer at the top. You can write up to 5,000 characters and attach up to 10 photos. Tap Post to share it with your followers.",
  },
  {
    q: "Who can see my posts and profile?",
    a: "Campusfeed is a campus-only network — only signed-in members can view profiles, posts, and stories. Your posts show up in the Home feed of people who follow you and stay visible on your profile page.",
  },
  {
    q: "How do I save a post for later?",
    a: "Tap the bookmark icon on any post. Saved posts are collected under Settings → Saved so you can revisit them anytime.",
  },
  {
    q: "How do I block someone?",
    a: "Open any post by that person, tap the ⋮ menu, and choose Block. You can review and unblock people later in Settings → Blocked Accounts.",
  },
  {
    q: "How do I turn push notifications on?",
    a: "Go to Settings → Enable Push Notifications and flip the switch. Your browser will ask for permission — choose Allow. You'll get alerts for likes, comments, and new followers. Flip the switch off anytime to stop them.",
  },
  {
    q: "How do I edit or delete my own post?",
    a: "Tap the ⋮ menu on your post. You'll see Edit (to change the text) and Delete (to remove it permanently).",
  },
  {
    q: "How do I switch between light and dark mode?",
    a: "Tap Appearance at the top of Settings to toggle dark mode. Your choice is remembered on this device.",
  },
  {
    q: "Something isn't working. What should I do?",
    a: "Use Settings → Report a Problem to send us the details, or email support@campusconnect.com. Include what you were doing and what you expected to happen.",
  },
];

export default function HelpCenterPage() {
  const router = useRouter();
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-all">
          <HiOutlineArrowLeft className="text-xl text-gray-600 dark:text-gray-400" />
        </button>
        <HiOutlineQuestionMarkCircle className="text-xl text-gray-900 dark:text-white" />
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Help Center</h1>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 px-1 mb-4">
        Quick answers to the most common questions. Tap a question to expand it.
      </p>

      <div className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-200 dark:border-white/[0.08] divide-y divide-gray-100 dark:divide-white/[0.04]">
        {FAQS.map((item, i) => (
          <div key={item.q}>
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-all"
              aria-expanded={open === i}
            >
              <span className="text-sm font-medium text-gray-900 dark:text-white">{item.q}</span>
              <HiOutlineChevronDown
                className={`shrink-0 text-gray-400 transition-transform ${open === i ? "rotate-180" : ""}`}
              />
            </button>
            {open === i && (
              <p className="px-4 pb-4 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{item.a}</p>
            )}
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-6">
        Still stuck? Use Settings → Report a Problem and we&apos;ll get back to you.
      </p>
    </div>
  );
}
