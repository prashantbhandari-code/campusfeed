"use client";

import { useState, useCallback } from "react";
import { useSession } from "@/lib/appwrite-session";
import { useSocket, useSocketEvent } from "@/lib/useSocket";
import CallModal from "./CallModal";

interface IncomingCall {
  callerId: string;
  callerName: string;
  callerAvatar?: string;
  offer: RTCSessionDescriptionInit;
  callType: "audio" | "video";
}

export default function CallProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const user = session?.user as any;
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [activeCall, setActiveCall] = useState<{ otherUser: any; callType: "audio" | "video" } | null>(null);

  const { emit } = useSocket(user?.id);

  // Listen for incoming calls from any page
  useSocketEvent("incoming-call", (data: IncomingCall) => {
    console.log("📞 Incoming call from", data.callerName);
    setIncomingCall(data);
  }, [user?.id]);

  const handleAcceptCall = useCallback(() => {
    if (!incomingCall) return;
    // Close incoming call modal, open active call with WebRTC
    setActiveCall({
      otherUser: { id: incomingCall.callerId, name: incomingCall.callerName, avatar: incomingCall.callerAvatar },
      callType: incomingCall.callType,
    });
    setIncomingCall(null);
  }, [incomingCall]);

  const handleRejectCall = useCallback(() => {
    if (!incomingCall) return;
    emit("call-reject", { callerId: incomingCall.callerId });
    setIncomingCall(null);
  }, [incomingCall, emit]);

  const handleCloseCall = useCallback(() => {
    setActiveCall(null);
  }, []);

  return (
    <>
      {children}

      {/* Incoming Call Overlay — shows on ANY page */}
      {incomingCall && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-gray-100 dark:bg-dark-800 rounded-2xl p-8 text-center max-w-sm mx-4 animate-in zoom-in-95">
            <div className="w-24 h-24 rounded-full bg-primary-600/20 flex items-center justify-center mx-auto mb-4 animate-pulse">
              <div className="w-20 h-20 rounded-full bg-primary-600 flex items-center justify-center text-white text-3xl font-bold">
                {incomingCall.callerName?.charAt(0)}
              </div>
            </div>
            <h3 className="text-xl font-bold text-white mb-1">{incomingCall.callerName}</h3>
            <p className="text-gray-400 text-sm mb-2">
              {incomingCall.callType === "video" ? "📹 Video Call" : "📞 Voice Call"}
            </p>
            <p className="text-gray-500 text-sm mb-6">Incoming call...</p>
            
            {/* Ringing animation */}
            <div className="flex justify-center gap-1 mb-6">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="w-2 h-2 bg-primary-400 rounded-full animate-bounce"
                  style={{ animationDelay: i * 200 + "ms" }}
                />
              ))}
            </div>

            <div className="flex justify-center gap-6">
              <button
                onClick={handleRejectCall}
                className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-all shadow-lg"
              >
                <svg className="w-7 h-7 text-white rotate-[135deg]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" />
                </svg>
              </button>
              <button
                onClick={handleAcceptCall}
                className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center transition-all shadow-lg animate-pulse"
              >
                <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Call Modal — when you accept or make a call */}
      {activeCall && user && (
        <CallModal
          isOpen={true}
          onClose={handleCloseCall}
          otherUser={activeCall.otherUser}
          currentUser={user}
          callType={activeCall.callType}
          isIncoming={!!incomingCall}
          offer={incomingCall?.offer}
        />
      )}
    </>
  );
}
