"use client";

import { useState } from "react";
import { useSession } from "@/lib/appwrite-session";
import { useSocket, useSocketEvent } from "@/lib/useSocket";
import CallModal from "./CallModal";

export default function IncomingCallListener() {
  const { data: session } = useSession();
  const user = session?.user as any;
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
