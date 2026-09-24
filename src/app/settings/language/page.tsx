"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { HiOutlineArrowLeft, HiOutlineGlobe, HiOutlineCheckCircle } from "react-icons/hi";
import toast from "react-hot-toast";

const LANGUAGES = [
  { code: "en-US", label: "English (US)", available: true },
  { code: "en-GB", label: "English (UK)", available: false },
  { code: "hi", label: "हिन्दी (Hindi)", available: false },
  { code: "od", label: "ଓଡ଼ିଆ (Odia)", available: false },
  { code: "bn", label: "বাংলা (Bengali)", available: false },
  { code: "es", label: "Español (Spanish)", available: false },
];

export default function LanguagePage() {
  const router = useRouter();
  const [selected, setSelected] = useState("en-US");

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-all">
          <HiOutlineArrowLeft className="text-xl text-gray-600 dark:text-gray-400" />
        </button>
        <HiOutlineGlobe className="text-xl text-gray-900 dark:text-white" />
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Language</h1>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 px-1 mb-4">
        English (US) is the only language available today. More languages are in translation and
        will unlock here as they finish.
      </p>

      <div className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-200 dark:border-white/[0.08] divide-y divide-gray-100 dark:divide-white/[0.04]">
        {LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            disabled={!lang.available}
            onClick={() => {
              setSelected(lang.code);
              toast.success(`Language set to ${lang.label}`);
            }}
            className={`w-full flex items-center justify-between px-4 py-3.5 text-left transition-all ${
              lang.available
                ? "hover:bg-gray-50 dark:hover:bg-white/[0.04] cursor-pointer"
                : "cursor-not-allowed opacity-60"
            }`}
          >
            <span className={`text-sm ${selected === lang.code ? "font-semibold text-gray-900 dark:text-white" : "text-gray-700 dark:text-gray-300"}`}>
              {lang.label}
            </span>
            {lang.available ? (
              selected === lang.code ? (
                <HiOutlineCheckCircle className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              ) : (
                <span className="text-xs text-gray-400 dark:text-gray-500">Tap to select</span>
              )
            ) : (
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/[0.08] text-gray-500 dark:text-gray-400">
                Coming soon
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
