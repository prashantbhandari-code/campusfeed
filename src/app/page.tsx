"use client";

import { useSession } from "@/lib/session";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { HiAcademicCap, HiCheckCircle } from "react-icons/hi";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session) {
      router.push("/feed");
    }
  }, [session, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-dark-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-dark-900 flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-2xl mx-auto animate-fade-in">
        <div className="flex items-center justify-center gap-3 mb-6">
          <HiAcademicCap className="text-6xl md:text-8xl text-campus-400" />
        </div>
        <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold mb-4 text-gradient whitespace-nowrap">Campusfeed</h1>
        <p className="text-xl md:text-2xl text-gray-500 dark:text-gray-400 mb-4">
          Your Campus. Your People.
        </p>
        <p className="text-base text-gray-400 dark:text-gray-500 mb-8">
          The private social network for KIIT University students
        </p>

        <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-campus-600/20 border border-campus-500/30 rounded-full mb-14">
          <HiCheckCircle className="text-campus-400" />
          <span className="text-campus-700 dark:text-campus-300 font-medium">Only @kiit.ac.in emails allowed</span>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/register"
            className="px-8 py-4 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-lg font-semibold transition-all hover-lift"
          >
            Join Campusfeed
          </Link>
          <Link
            href="/login"
            className="px-8 py-4 border-2 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-white/10 text-gray-900 dark:text-white rounded-xl text-lg font-semibold transition-all hover-lift"
          >
            Sign In
          </Link>
        </div>

        <div className="mt-20 grid grid-cols-3 gap-12 text-center">
          <div>
            <div className="text-3xl font-bold text-campus-400">1st</div>
            <div className="text-gray-400 dark:text-gray-500 mt-1">Campus Verified</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-purple-400">20+</div>
            <div className="text-gray-400 dark:text-gray-500 mt-1">Departments</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-pink-400">25K+</div>
            <div className="text-gray-400 dark:text-gray-500 mt-1">Students</div>
          </div>
        </div>
      </div>
    </div>
  );
}
