"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { HiOutlineArrowLeft, HiOutlineArchive, HiOutlineBookmark, HiOutlineClock, HiOutlineChevronRight } from "react-icons/hi";

export default function ArchivePage() {
  const router = useRouter();
  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-all">
          <HiOutlineArrowLeft className="text-xl text-gray-600 dark:text-gray-400" />
        </button>
        <HiOutlineArchive className="text-xl text-gray-900 dark:text-white" />
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Archive</h1>
      </div>

      <div className="text-center py-12 bg-white dark:bg-dark-800 rounded-2xl border border-gray-200 dark:border-white/[0.08] mb-4">
        <HiOutlineClock className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
        <p className="text-gray-500 dark:text-gray-400 text-lg">Nothing archived yet</p>
        <p className="text-gray-400 dark:text-gray-500 text-sm mt-2 px-6 leading-relaxed">
          The archive will hold posts and stories you choose to tuck away instead of deleting.
          It isn&apos;t live yet — until then, everything you keep is safe in Saved.
        </p>
      </div>

      <Link
        href="/saved"
        className="flex items-center justify-between px-4 py-3.5 bg-white dark:bg-dark-800 rounded-2xl border border-gray-200 dark:border-white/[0.08] hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-all"
      >
        <div className="flex items-center gap-3">
          <HiOutlineBookmark className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Go to Saved</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Posts you bookmarked, all in one place</p>
          </div>
        </div>
        <HiOutlineChevronRight className="text-gray-400" />
      </Link>
    </div>
  );
}
