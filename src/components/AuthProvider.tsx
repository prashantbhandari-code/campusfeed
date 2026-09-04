"use client";

import { AppwriteSessionProvider as SessionProvider } from "@/lib/appwrite-session";
export default function AuthProvider({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
