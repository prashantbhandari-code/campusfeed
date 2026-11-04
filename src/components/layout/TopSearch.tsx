"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { HiSearch } from "react-icons/hi";

/**
 * Search bar shown at the TOP of the app (mobile navbar row 2, desktop
 * sticky bar above the content column). It only collects the term — the
 * actual searching lives on /explore, so submitting navigates there with
 * ?q=... which the explore page seeds into its own query state.
 */
export default function TopSearch({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [term, setTerm] = useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = term.trim();
    router.push(q ? `/explore?q=${encodeURIComponent(q)}` : "/explore");
  };

  return (
    <form onSubmit={onSubmit} role="search" className={`relative ${className}`}>
      <HiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-lg pointer-events-none" />
      <input
        type="search"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        placeholder="Search Campusfeed"
        aria-label="Search Campusfeed"
        className="w-full h-10 pl-11 pr-4 text-sm bg-gray-100 dark:bg-dark-700 border border-gray-200 dark:border-dark-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
      />
    </form>
  );
}
