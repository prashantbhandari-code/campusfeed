"use client";

import { SessionProvider as SessionProvider } from "@/lib/auth/session";
export default function AuthProvider({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
