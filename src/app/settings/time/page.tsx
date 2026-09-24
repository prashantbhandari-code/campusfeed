"use client";

import { useRouter } from "next/navigation";
import { HiOutlineArrowLeft, HiOutlineClock, HiOutlineBell, HiOutlineDeviceMobile, HiOutlineMoon } from "react-icons/hi";

const TIPS = [
  {
    icon: HiOutlineBell,
    title: "Batch your notifications",
    body: "Keep push notifications on for likes, comments, and follows, but check the app on your own schedule instead of after every alert.",
  },
  {
    icon: HiOutlineMoon,
    title: "Wind down at night",
    body: "Turn off push notifications from Settings before bed — the toggle takes effect immediately, no restart needed.",
  },
  {
    icon: HiOutlineDeviceMobile,
    title: "Take breaks intentionally",
    body: "Use your phone's built-in screen-time or Digital Wellbeing tools to set daily limits for social apps alongside Campusfeed.",
  },
];

export default function TimeManagementPage() {
  const router = useRouter();
  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-all">
          <HiOutlineArrowLeft className="text-xl text-gray-600 dark:text-gray-400" />
        </button>
        <HiOutlineClock className="text-xl text-gray-900 dark:text-white" />
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Time Management</h1>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 px-1 mb-4">
        A few practical ways to keep your Campusfeed time intentional:
      </p>

      <div className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-200 dark:border-white/[0.08] divide-y divide-gray-100 dark:divide-white/[0.04]">
        {TIPS.map((t) => (
          <div key={t.title} className="flex items-start gap-3 px-4 py-3.5">
            <t.icon className="w-5 h-5 shrink-0 mt-0.5 text-primary-600 dark:text-primary-400" />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{t.title}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{t.body}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-6 leading-relaxed">
        In-app usage dashboards and custom reminders aren&apos;t available yet — we&apos;ll surface them
        here first when they ship.
      </p>
    </div>
  );
}
