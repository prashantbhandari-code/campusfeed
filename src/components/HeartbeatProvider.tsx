"use client";

import { useHeartbeat } from "@/lib/heartbeat";

export default function HeartbeatProvider({ children }: { children: React.ReactNode }) {
  useHeartbeat();
  return <>{children}</>;
}