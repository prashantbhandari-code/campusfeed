"use client";

import { useEffect, useState } from "react";

/**
 * Detects stale UI after a deployment. Long-lived tabs (desktop pinned all
 * day, mobile Chrome's back-forward cache) keep running old JavaScript until
 * a reload — the #1 cause of "my other device shows a different app".
 *
 * Runs a version probe every 10 minutes (piggybacked on the keepalive ping):
 *  1. Server returns its current build id (x-build-id header).
 *  2. Client compares against the id baked into its own bundle at build time.
 *  3. On mismatch, show a non-blocking banner: tap to hard-reload.
 */
declare global {
  interface Window {
    __BUILD_ID__?: string;
  }
}

const INTERVAL = 10 * 60 * 1000; // 10 minutes
const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID || "";

export default function KeepAlive() {
  const [stale, setStale] = useState(false);

  useEffect(() => {
    const ping = () => {
      fetch("/api/keepalive", { cache: "no-store" })
        .then((res) => {
          const serverId = res.headers.get("x-build-id") || "";
          if (BUILD_ID && serverId && BUILD_ID !== serverId && window.__BUILD_ID__ === BUILD_ID) {
            setStale(true);
          }
        })
        .catch(() => {});
    };

    // Ping immediately on mount
    ping();

    // Then every 10 minutes
    const id = setInterval(ping, INTERVAL);

    return () => clearInterval(id);
  }, []);

  const reload = () => {
    if ("caches" in window) {
      // Drop cached HTML/assets so the fresh deploy is guaranteed to load
      caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))).finally(() => location.reload());
    } else {
      location.reload();
    }
  };

  return (
    <>
      {stale && (
        <div className="fixed inset-x-0 top-0 z-[100] flex items-center justify-center gap-3 bg-primary-600 px-4 py-2 text-sm text-white shadow-lg">
          <span className="truncate">Campusfeed was updated — reload for the latest version</span>
          <button
            onClick={reload}
            className="flex-shrink-0 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold hover:bg-white/30 transition-colors"
          >
            Reload
          </button>
          <button
            onClick={() => setStale(false)}
            aria-label="Dismiss"
            className="flex-shrink-0 text-white/80 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}
