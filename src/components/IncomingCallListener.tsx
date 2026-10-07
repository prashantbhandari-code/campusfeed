"use client";

import { useSession } from "@/lib/session";
import { useSocket, useSocketEvent } from "@/lib/useSocket";
import { stashIceCandidate } from "@/lib/call-signals";
import { useCall } from "./CallProvider";

// Anchors the shared realtime loop (ref-counted polling) on every (main)
// page — unread badges, group chat, and incoming calls all ride it — and
// routes incoming calls + ICE candidates into the global CallProvider, so a
// call keeps running across page navigation.
export default function IncomingCallListener() {
  const { data: session } = useSession();
  const user = session?.user;
  useSocket(user?.id);
  const { receiveIncomingCall } = useCall();

  useSocketEvent("incoming-call", (data: any) => {
    receiveIncomingCall({
      otherUser: {
        id: data.callerId,
        name: data.callerName,
        username: "",
        avatar: data.callerAvatar,
      },
      callType: data.callType,
      isIncoming: true,
      offer: data.offer,
    });
  }, []);

  // This listener is mounted from page load, so it sees EVERY ice-candidate
  // — including the caller's burst that ships in the same frame as the offer,
  // which lands before <CallModal> has mounted and subscribed. Park them in
  // the shared buffer; CallModal drains on open and receives the rest live.
  useSocketEvent("ice-candidate", (d: any) => {
    stashIceCandidate(d.fromUserId, d.candidate);
  }, []);

  return null;
}
