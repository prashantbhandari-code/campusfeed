"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { useSession } from "@/lib/auth/session";
import CallModal from "./CallModal";

// Owns the single active call and mounts <CallModal> at the layout level, so
// a minimized call keeps running across page navigation — the chat stays
// usable and back-navigation no longer kills the call.

export interface ActiveCall {
  otherUser: { id: string; name: string; username: string; avatar?: string };
  callType: "audio" | "video";
  isIncoming?: boolean;
  offer?: RTCSessionDescriptionInit;
}

interface CallContextValue {
  startCall: (otherUser: ActiveCall["otherUser"], callType: "audio" | "video") => void;
  receiveIncomingCall: (call: ActiveCall) => void;
  clearCall: () => void;
}

const CallContext = createContext<CallContextValue | null>(null);

export function useCall(): CallContextValue {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCall must be used within CallProvider");
  return ctx;
}

export function CallProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const user = session?.user;
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);

  const startCall = useCallback(
    (otherUser: ActiveCall["otherUser"], callType: "audio" | "video") => {
      setActiveCall({ otherUser, callType, isIncoming: false });
    },
    []
  );

  const receiveIncomingCall = useCallback((call: ActiveCall) => {
    setActiveCall(call);
  }, []);

  const clearCall = useCallback(() => setActiveCall(null), []);

  return (
    <CallContext.Provider value={{ startCall, receiveIncomingCall, clearCall }}>
      {children}
      {activeCall && user && (
        <CallModal
          isOpen
          onClose={clearCall}
          otherUser={activeCall.otherUser}
          currentUser={user}
          callType={activeCall.callType}
          isIncoming={activeCall.isIncoming}
          offer={activeCall.offer}
        />
      )}
    </CallContext.Provider>
  );
}
