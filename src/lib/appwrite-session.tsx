"use client";

import { useState, useEffect, useCallback, createContext, useContext, useRef } from "react";

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
    role: string;
  };
}

export type SessionStatus = "loading" | "authenticated" | "unauthenticated";

export interface SessionContextValue {
  data: AppwriteSession | null;
  status: SessionStatus;
  update: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue>({
  data: null,
  status: "loading",
  update: async () => {},
});

/**
 * Session provider — the single client-side source of auth state.
 * Identity comes from the signed HttpOnly cc_session cookie via /api/auth/me;
 * there is no client SDK or client-set credential involved.
 */
export function AppwriteSessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AppwriteSession | null>(null);
  const [status, setStatus] = useState<SessionStatus>("loading");
  const mountedRef = useRef(true);

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const profile = await res.json();
        if (mountedRef.current) {
          setSession({
            user: {
              id: profile.id || "",
              name: profile.name || "",
              email: profile.email || "",
              username: profile.username || "",
              avatar: profile.avatar || "",
              department: profile.department || "",
              batchYear: profile.batchYear || "",
              rollNumber: profile.rollNumber || "",
              collegeEmail: profile.collegeEmail || "",
              role: profile.role || "student",
            },
          });
          setStatus("authenticated");
        }
      } else if (res.status === 401 || res.status === 403) {
        // Definitive "not signed in" — clear the session
        if (mountedRef.current) {
          setSession(null);
          setStatus("unauthenticated");
        }
      }
      // 5xx / other: transient server failure, not an auth verdict.
      // Keep whatever session we already have so a DB blip doesn't sign the
      // user out; if we never had one, fall through to unauthenticated below.
      else if (mountedRef.current) {
        setSession((prev) => {
          if (prev) return prev;
          setStatus("unauthenticated");
          return null;
        });
      }
    } catch {
      // Network error — same rule as above: don't drop a known session
      if (mountedRef.current) {
        setSession((prev) => {
          if (prev) return prev;
          setStatus("unauthenticated");
          return null;
        });
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchSession();
    return () => {
      mountedRef.current = false;
    };
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
    await fetch("/api/auth/logout", { method: "POST" });
  } catch {
    // Ignore network errors — redirect below happens regardless
  }
  window.location.href = "/login";
}
