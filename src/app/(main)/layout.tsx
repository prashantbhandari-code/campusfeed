"use client";

import { useSession } from "@/lib/auth/session";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import Navbar from "@/components/layout/Navbar";
import TopSearch, { shouldShowTopSearch } from "@/components/layout/TopSearch";
import Sidebar from "@/components/layout/Sidebar";
import BottomNav from "@/components/layout/BottomNav";
import PageTransition from "@/components/layout/PageTransition";
import IncomingCallListener from "@/components/call/IncomingCallListener";
import CapacitorCallListener from "@/components/call/CapacitorCallListener";
import { CallProvider } from "@/components/call/CallProvider";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  // The search bar is home-page chrome: on /messages a sticky bar on top of the
  // chat header costs the conversation its first row for nothing.
  const showTopSearch = shouldShowTopSearch(pathname);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-dark-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <CallProvider>
      <div className="h-dvh flex flex-col">
        <Navbar />
        {/* min-h-0 lets this wrapper shrink below content height so <main>
            becomes the scroll container — without it the wrapper grows to
            content height, the window scrolls instead, and the fixed bottom
            nav covers the last row of content. */}
        {/* pt-28 (112px) clears the two-row fixed mobile navbar: logo row
            (h-14) + search row (h-14). Off the feed there is no search row, so
            pt-14 clears the single remaining row. */}
        <div className={`flex-1 flex min-h-0 ${showTopSearch ? "pt-28" : "pt-14"} lg:pt-0`}>
          {/* Desktop sidebar */}
          <Sidebar />
          {/* Main content — offset by sidebar width on desktop; pb-24 clears
              the fixed mobile bottom nav so the last card is reachable.
              Desktop: search pins to the top of this scroll column (the
              desktop half of "search on top"), so page headers that stick at
              top-0 use lg:top-14 to park directly beneath it. */}
          <main className="flex-1 lg:ml-64 min-h-0 overflow-y-auto pb-24 lg:pb-6">
            {showTopSearch && (
              <div className="hidden lg:flex sticky top-0 z-30 h-14 items-center px-6 border-b border-gray-200 dark:border-white/[0.06] bg-white/95 dark:bg-dark-900/95 backdrop-blur-sm">
                <TopSearch className="w-full max-w-xl" />
              </div>
            )}
            <PageTransition>{children}</PageTransition>
          </main>
        </div>
        <BottomNav />
        <IncomingCallListener />
        <CapacitorCallListener />
      </div>
    </CallProvider>
  );
}
