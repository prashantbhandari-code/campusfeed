"use client";

import { useEffect, useState } from "react";
import { account } from "@/lib/appwrite";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * OAuth callback bridge.
 *
 * The Google buttons use Appwrite's OAuth2 TOKEN flow (createOAuth2Token) so
 * the user lands here with userId + secret query params instead of getting a
 * session cookie directly from Appwrite's domain. We exchange them for a real
 * session, then call /api/auth/session-sync: the server verifies a short-lived
 * JWT and sets the signed HttpOnly cc_session cookie that all app APIs
 * authenticate with. Without that cookie the feed and every other API 401
 * for Google users.
 */
export default function OAuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const userId = searchParams.get("userId");
    const secret = searchParams.get("secret");

    if (!userId || !secret) {
      setError("Missing OAuth credentials. Please try signing in again.");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        // 1. Exchange token for a real Appwrite session (stored by the SDK)
        await account.createSession({ userId, secret });

        // 2. Get a short-lived JWT bound to that session
        const { jwt } = await account.createJWT();

        // 3. Server verifies the JWT and sets the signed cc_session cookie
        const res = await fetch("/api/auth/session-sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jwt }),
        });

        if (cancelled) return;

        const data = await res.json().catch(() => ({}));

        if (res.ok) {
          router.replace("/feed");
          return;
        }

        if (data.redirect) {
          // New Google user without a profile yet
          router.replace(data.redirect);
          return;
        }

        setError(data.error || "Sign-in completed but session setup failed. Please try again.");
      } catch {
        if (!cancelled) {
          setError("Could not complete sign-in. Please try again.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-white dark:bg-dark-900 flex items-center justify-center px-4">
      <div className="text-center animate-slide-up">
        {error ? (
          <>
            <p className="text-lg font-semibold text-red-500 mb-2">Sign-in failed</p>
            <p className="text-gray-500 dark:text-gray-400 mb-6">{error}</p>
            <a
              href="/login"
              className="inline-block px-6 py-3 bg-campus-600 text-white rounded-full font-medium hover:bg-campus-700 transition-colors"
            >
              Back to login
            </a>
          </>
        ) : (
          <>
            <div className="w-12 h-12 border-4 border-campus-500/30 border-t-campus-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-300 font-medium">Completing sign-in…</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Setting up your session securely</p>
          </>
        )}
      </div>
    </div>
  );
}
