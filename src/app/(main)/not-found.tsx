"use client";

import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4">🔍</div>
        <h2 className="text-xl font-bold text-white mb-2">Page not found</h2>
        <p className="text-gray-400 text-sm mb-6">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/feed"
          className="inline-block px-6 py-3 bg-primary-600 hover:bg-primary-700 rounded-xl text-white font-semibold transition-colors"
        >
          Back to Feed
        </Link>
      </div>
    </div>
  );
}
