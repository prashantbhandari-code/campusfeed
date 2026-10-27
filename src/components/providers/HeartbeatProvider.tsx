"use client";

import { useHeartbeat } from "@/lib/hooks/heartbeat";

export default function HeartbeatProvider({ children }: { children: React.ReactNode }) {
  useHeartbeat();
  return <>{children}</>;
}