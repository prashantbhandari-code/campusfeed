"use client";

import { useState } from "react";
import { useSession } from "@/lib/appwrite-session";
import { useSocket, useSocketEvent } from "@/lib/useSocket";
import { stashIceCandidate } from "@/lib/call-signals";
import CallModal from "./CallModal";

export default function IncomingCallListener() {
  const { data: session } = useSession();
  const user = session?.user;
  // Anchors the shared realtime loop (ref-counted polling) on every (main)
  // page — unread badges, group chat, and incoming calls all ride it.
  useSocket(user?.id);
  const [showCall, setShowCall] = useState(false);
  const [callData, setCallData] = useState<any>(null);

  useSocketEvent("incoming-call", (data: any) => {
    console.log("📞 Incoming call from", data.callerName);
    setCallData(data);
    setShowCall(true);
  }, []);

  // This listener is mounted from page load, so it sees EVERY ice-candidate
  // — including the caller's burst that ships in the same frame as the offer,
  // which lands before <CallModal> has mounted and subscribed. Park them in
  // the shared buffer; CallModal drains on open and receives the rest live.
  useSocketEvent("ice-candidate", (d: any) => {
    stashIceCandidate(d.fromUserId, d.candidate);
  }, []);

  if (!showCall || !callData || !user) return null;

  return (
    <CallModal
      isOpen={showCall}
      onClose={() => { setShowCall(false); setCallData(null); }}
      otherUser={{
        id: callData.callerId,
        name: callData.callerName,
        username: "",
        avatar: callData.callerAvatar,
      }}
      currentUser={user}
      callType={callData.callType}
      isIncoming
      offer={callData.offer}
    />
  );
}
