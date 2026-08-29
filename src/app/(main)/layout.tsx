"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import BottomNav from "@/components/BottomNav";
import PageTransition from "@/components/PageTransition";

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
      <div className="min-h-screen flex items-center justify-center bg-dark-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-dark-900">
      <Navbar />
      <div className="flex pt-16 md:pt-16">
        {/* Desktop sidebar */}
        <Sidebar />
        {/* Main content — offset by sidebar width on desktop, bottom nav height on mobile */}
        <main className="flex-1 md:ml-64 min-h-[calc(100vh-4rem)] pb-20 md:pb-0">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
