"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useSocketEvent } from "@/lib/useSocket";
import CallModal from "./CallModal";

export default function IncomingCallListener() {
  const { data: session } = useSession();
  const user = session?.user as any;
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
