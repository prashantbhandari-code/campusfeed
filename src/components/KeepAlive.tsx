"use client";

import { useEffect } from "react";

const INTERVAL = 10 * 60 * 1000; // 10 minutes

export default function KeepAlive() {
  useEffect(() => {
    const ping = () => {
      fetch("/api/keepalive").catch(() => {});
    };

    // Ping immediately on mount
    ping();

    // Then every 10 minutes
    const id = setInterval(ping, INTERVAL);

    return () => clearInterval(id);
  }, []);

  return null;
}
