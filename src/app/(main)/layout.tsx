"use client";

import { useSession } from "@/lib/auth/session";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import BottomNav from "@/components/layout/BottomNav";
import PageTransition from "@/components/layout/PageTransition";
import IncomingCallListener from "@/components/call/IncomingCallListener";
import CapacitorCallListener from "@/components/call/CapacitorCallListener";
import { CallProvider } from "@/components/call/CallProvider";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();

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
        <div className="flex-1 flex pt-14 lg:pt-0 min-h-0">
          {/* Desktop sidebar */}
          <Sidebar />
          {/* Main content — offset by sidebar width on desktop; pb-24 clears
              the fixed mobile bottom nav so the last card is reachable. */}
          <main className="flex-1 lg:ml-64 min-h-0 overflow-y-auto pb-24 lg:pb-6">
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
