"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  HiOutlineArrowLeft,
  HiOutlineInformationCircle,
  HiOutlineCalendar,
  HiOutlineDocumentText,
  HiOutlineQuestionMarkCircle,
  HiOutlineFlag,
  HiOutlineShieldCheck,
  HiOutlineAcademicCap,
  HiOutlineChevronRight,
} from "react-icons/hi2";

// The Info tab is the mobile app's "everything else" drawer: Events and
// Blogs lost their bottom-nav slots when search moved to the top, so both
// live here alongside the support links that Settings also mirrors.
const INFO_SECTIONS = [
  {
    title: "Campus",
    items: [
      {
        label: "Events",
        description: "Workshops, fests and deadlines around campus",
        icon: HiOutlineCalendar,
        href: "/events",
      },
      {
        label: "Blogs",
        description: "Read what campus is writing — and publish your own",
        icon: HiOutlineDocumentText,
        href: "/blogs",
      },
    ],
  },
  {
    title: "Support",
    items: [
      {
        label: "Help Center",
        description: "Get help with Campusfeed",
        icon: HiOutlineQuestionMarkCircle,
        href: "/help",
      },
      {
        label: "Report a Problem",
        description: "Let us know about issues",
        icon: HiOutlineFlag,
        href: "/report",
      },
      {
        label: "Terms & Policies",
        description: "Terms of service and privacy policy",
        icon: HiOutlineShieldCheck,
        href: "/terms",
      },
      {
        label: "About",
        description: "Campusfeed v1.0 for KIIT University",
        icon: HiOutlineInformationCircle,
        href: "/about",
      },
    ],
  },
];

export default function InfoPage() {
  const router = useRouter();

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          aria-label="Go back"
          className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-all"
        >
          <HiOutlineArrowLeft className="text-xl text-gray-600 dark:text-gray-400" />
        </button>
        <div className="flex items-center gap-2">
          <HiOutlineInformationCircle className="text-xl text-gray-900 dark:text-white" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Info</h1>
        </div>
      </div>

      {/* What this app is — the same one-liner the landing page leads with. */}
      <div className="glass-card rounded-2xl p-5 mb-6 text-center">
        <HiOutlineAcademicCap className="text-3xl text-primary-500 mx-auto mb-2" />
        <p className="font-semibold text-gray-900 dark:text-white">Campusfeed</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
          The private social network for KIIT University students. Share posts,
          join groups, chat with friends, and stay updated on campus events.
        </p>
      </div>

      {INFO_SECTIONS.map((section) => (
        <div key={section.title} className="mb-4">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider px-1 mb-2">
            {section.title}
          </h3>
          <div className="glass-card rounded-2xl overflow-hidden divide-y divide-gray-100 dark:divide-white/[0.04]">
            {section.items.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-all"
              >
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

      <p className="text-center text-xs text-gray-300 dark:text-gray-600 pb-20">
        Campusfeed v1.0 for KIIT University
      </p>
    </div>
  );
}
