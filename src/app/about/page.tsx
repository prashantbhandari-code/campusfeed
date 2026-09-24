"use client";

import { useRouter } from "next/navigation";
import {
  HiOutlineArrowLeft,
  HiOutlineInformationCircle,
  HiOutlineAcademicCap,
  HiOutlineCode,
  HiOutlineGlobeAlt,
  HiOutlineShieldCheck,
} from "react-icons/hi";

const FEATURES = [
  { icon: HiOutlineGlobeAlt, label: "Campus Feed", desc: "Posts, photos, likes and comments from people you follow" },
  { icon: HiOutlineAcademicCap, label: "Stories & Live", desc: "Share moments that disappear after 24 hours" },
  { icon: HiOutlineCode, label: "Messages & Calls", desc: "Direct messages with file sharing, voice notes, and audio/video calls" },
  { icon: HiOutlineShieldCheck, label: "Privacy Controls", desc: "Block accounts, manage saved posts, and control your data" },
];

export default function AboutPage() {
  const router = useRouter();
  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-all">
          <HiOutlineArrowLeft className="text-xl text-gray-600 dark:text-gray-400" />
        </button>
        <HiOutlineInformationCircle className="text-xl text-gray-900 dark:text-white" />
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">About</h1>
      </div>

      <div className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-200 dark:border-white/[0.08] p-6 text-center mb-4">
        <div className="text-5xl mb-3">🎓</div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Campusfeed</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Version 1.0 · Built for KIIT University</p>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-4 leading-relaxed text-left">
          Campusfeed is a private social network for campus life. It keeps students connected with a
          focused feed, stories, direct messaging, and calls — without the noise of public social
          media. Only signed-in members of the campus community can see what you share.
        </p>
      </div>

      <div className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-200 dark:border-white/[0.08] divide-y divide-gray-100 dark:divide-white/[0.04] mb-4">
        {FEATURES.map((f) => (
          <div key={f.label} className="flex items-start gap-3 px-4 py-3.5">
            <f.icon className="w-5 h-5 shrink-0 mt-0.5 text-primary-600 dark:text-primary-400" />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{f.label}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-200 dark:border-white/[0.08] p-4 text-xs text-gray-500 dark:text-gray-400 space-y-1.5">
        <p><span className="font-semibold text-gray-700 dark:text-gray-300">Live site:</span> campusfeed-prashantbhandari-code.vercel.app</p>
        <p><span className="font-semibold text-gray-700 dark:text-gray-300">Built with:</span> Next.js, Appwrite, Prisma &amp; PostgreSQL</p>
        <p><span className="font-semibold text-gray-700 dark:text-gray-300">Support:</span> support@campusconnect.com</p>
        <p><span className="font-semibold text-gray-700 dark:text-gray-300">©</span> 2026 Campusfeed. All rights reserved.</p>
      </div>
    </div>
  );
}
