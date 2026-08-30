"use client";

import { useRouter } from "next/navigation";
import { HiOutlineArrowLeft, HiOutlineDocument } from "react-icons/hi";

export default function TermsPoliciesPage() {
  const router = useRouter();
  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-all">
          <HiOutlineArrowLeft className="text-xl text-gray-600 dark:text-gray-400" />
        </button>
        <HiOutlineDocument className="text-xl text-gray-900 dark:text-white" />
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Terms & Policies</h1>
      </div>
      <div className="text-center py-16 bg-white dark:bg-dark-800 rounded-2xl border border-gray-200 dark:border-white/[0.08]">
        <HiOutlineDocument className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
        <p className="text-gray-500 dark:text-gray-400 text-lg">Terms & Policies</p>
        <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Terms of service and privacy policy</p>
      </div>
    </div>
  );
}
