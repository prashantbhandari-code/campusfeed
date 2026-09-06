"use client";

import { useState, useEffect, useCallback, createContext, useContext, useRef } from "react";
import { account, client } from "./appwrite";

// Session shape that matches NextAuth's useSession() return value
export interface AppwriteSession {
  user: {
    id: string;
    name: string;
    email: string;
    username: string;
    avatar: string;
    department: string;
    batchYear: string;
    rollNumber: string;
    collegeEmail: string;
  };
}

export type SessionStatus = "loading" | "authenticated" | "unauthenticated";

export interface SessionContextValue {
  data: AppwriteSession | null;
  status: SessionStatus;
  update: () => Promise<void>;
}

// Context
const SessionContext = createContext<SessionContextValue>({
  data: null,
  status: "loading",
  update: async () => {},
});

// Provider component — drop-in replacement for NextAuth's SessionProvider
export function AppwriteSessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AppwriteSession | null>(null);
  const [status, setStatus] = useState<SessionStatus>("loading");
  const mountedRef = useRef(true);

  const fetchSession = useCallback(async () => {
    try {
      // First check if there's an active Appwrite session via SDK
      let awUserId = "";
      try {
        const user = await account.get();
        awUserId = user.$id;
      } catch {
        // No SDK session — will try server auth via cc_session cookie
      }

      // Fetch profile from our DB (tries x-appwrite-user-id header, then cc_session cookie)
      const headers: Record<string, string> = {};
      if (awUserId) headers["x-appwrite-user-id"] = awUserId;

      const res = await fetch("/api/auth/me", { headers });

      if (res.ok) {
        const profile = await res.json();
        if (mountedRef.current) {
          setSession({
            user: {
              id: profile.id || awUserId,
              name: profile.name || "",
              email: profile.email || "",
              username: profile.username || "",
              avatar: profile.avatar || "",
              department: profile.department || "",
              batchYear: profile.batchYear || "",
              rollNumber: profile.rollNumber || "",
              collegeEmail: profile.collegeEmail || "",
            },
          });
          setStatus("authenticated");
        }
      } else {
        if (mountedRef.current) {
          setSession(null);
          setStatus("unauthenticated");
        }
      }
    } catch {
      if (mountedRef.current) {
        setSession(null);
        setStatus("unauthenticated");
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchSession();
    return () => { mountedRef.current = false; }
  }, [fetchSession]);

  const update = useCallback(async () => {
    await fetchSession();
  }, [fetchSession]);

  return (
    <SessionContext.Provider value={{ data: session, status, update }}>
      {children}
    </SessionContext.Provider>
  );
}

// Drop-in replacement for useSession() from "next-auth/react"
export function useSession() {
  return useContext(SessionContext);
}

// Drop-in replacement for signOut() from "next-auth/react"
export async function signOutAppwrite() {
  try {
    await account.deleteSession("current");
  } catch {
    // Ignore errors — still clear the app cookie below
  }
  try {
    // Clear the signed cc_session cookie (HttpOnly → must be done server-side)
    await fetch("/api/auth/logout", { method: "POST" });
  } catch {
    // Ignore network errors — redirect below happens regardless
  }
  window.location.href = "/login";
}

// Drop-in replacement for signIn() from "next-auth/react"
export async function signInAppwrite(
  provider: string,
  options?: { callbackUrl?: string; redirect?: boolean }
) {
  if (provider === "google") {
    const { OAuthProvider } = await import("appwrite");
    // Token flow: Appwrite redirects back to our bridge page with userId+secret,
    // where the signed cc_session cookie gets set for server-side auth.
    account.createOAuth2Token(
      OAuthProvider.Google,
      (options?.callbackUrl || "/feed").startsWith("http")
        ? (options?.callbackUrl || "/feed")
        : window.location.origin + "/auth/oauth/callback",
      window.location.origin + "/login?error=google-failed"
    );
    return;
  }
  
  // For credentials, throw error — handled separately
  throw new Error("Use signInWithCredentials() for email/password login");
}

export async function signInWithCredentials(email: string, password: string) {
  await account.createEmailPasswordSession(email, password);
  return { error: null };
}
