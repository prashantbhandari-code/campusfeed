"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { HiPhone, HiPhoneXMark, HiVideoCamera, HiVideoCameraSlash, HiMicrophone, HiArrowPath } from "react-icons/hi2";
import { useSocket, useSocketEvent } from "@/lib/useSocket";
import { attachIceConsumer, detachIceConsumer } from "@/lib/call-signals";

// STUN discovers reflexive addresses; the TURN relay is the fallback when
// both peers sit behind symmetric NATs or UDP is blocked (common on mobile
// carriers) — without it those pairs can never connect. Open Relay's public
// instance is free; swap in a self-hosted coturn before heavy production use.
const ICE_SERVERS: RTCIceServer[] = [
  {
    urls: [
      "stun:stun.l.google.com:19302",
      "stun:stun1.l.google.com:19302",
      "stun:stun.cloudflare.com:3478",
    ],
  },
  {
    urls: [
      "turn:openrelay.metered.ca:80",
      "turn:openrelay.metered.ca:443",
      "turn:openrelay.metered.ca:443?transport=tcp",
    ],
    username: "openrelayproject",
    credential: "openrelayproject",
  },
];

interface CallModalProps {
  isOpen: boolean;
  onClose: () => void;
  otherUser: { id: string; name: string; username: string; avatar?: string };
  currentUser: { id: string; name: string; avatar?: string };
  callType: "audio" | "video";
  isIncoming?: boolean;
  offer?: RTCSessionDescriptionInit;
}

export default function CallModal({ isOpen, onClose, otherUser, currentUser, callType: initialCallType, isIncoming = false, offer }: CallModalProps) {
  const { emit } = useSocket(currentUser?.id);
  const [callState, setCallState] = useState<string>(isIncoming ? "ringing" : "requesting-permission");
  const [callType] = useState(initialCallType);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const durationRef = useRef<NodeJS.Timeout | null>(null);
  const ringRef = useRef<NodeJS.Timeout | null>(null);
  const startedRef = useRef(false);
  const callStateRef = useRef(callState);
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([]);
  // ICE can arrive before the remote description it belongs to (poll batches
  // deliver answer + candidates together) — hold until the description is set.
  const deliverPendingIce = async () => {
    const pc = pcRef.current;
    if (!pc || !pc.remoteDescription) return;
    for (const c of pendingIceRef.current.splice(0)) {
      try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch (e) { console.warn("ICE candidate failed:", e); }
    }
  };

  const stopRing = useCallback(() => { if (ringRef.current) { clearInterval(ringRef.current); ringRef.current = null; } }, []);
  const playRing = useCallback(() => {
    try {
      const ctx = new AudioContext();
      const tone = () => { const o = ctx.createOscillator(); const g = ctx.createGain(); o.connect(g); g.connect(ctx.destination); o.frequency.value = 440; g.gain.value = 0.3; o.start(); setTimeout(() => o.stop(), 1000); };
      tone(); ringRef.current = setInterval(tone, 2000);
    } catch (error) { console.error("Operation failed:", error); }
  }, []);
  const endCall = useCallback(() => {
    stopRing();
    if (durationRef.current) { clearInterval(durationRef.current); durationRef.current = null; }
    emit("call-end", { otherUserId: otherUser.id });
    if (localStreamRef.current) { localStreamRef.current.getTracks().forEach(t => t.stop()); localStreamRef.current = null; }
    if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }
    setCallState("ended");
    setTimeout(onClose, 1000);
  }, [otherUser.id, emit, onClose, stopRing]);
  const setupPC = useCallback((pc: RTCPeerConnection) => {
    pc.ontrack = (e) => {
      // Voice calls have no <video> element — without attaching the remote
      // stream to *some* media element, its audio is never played.
      const stream = e.streams[0];
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = stream;
      else if (remoteAudioRef.current) remoteAudioRef.current.srcObject = stream;
    };
    pc.onicecandidate = (e) => { if (e.candidate) emit("ice-candidate", { targetUserId: otherUser.id, candidate: e.candidate }); };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") { setCallState("connected"); stopRing(); durationRef.current = setInterval(() => setCallDuration(p => p + 1), 1000); }
      else if (pc.connectionState === "failed") endCall();
    };
    // Also watch ICE connection state for more granular failure detection
    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === "failed") endCall();
      // Don't end on 'disconnected' — allow for brief interruptions and reconnection
    };
  }, [otherUser.id, emit, endCall, stopRing]);
  const requestPermissionAndCall = useCallback(async () => {
    setErrorMsg(null);
    setCallState("requesting-permission");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: callType === "video" });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      // Only create PC after permission is granted
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      pcRef.current = pc;
      stream.getTracks().forEach(t => pc.addTrack(t, stream));
      setupPC(pc);
      const sdp = await pc.createOffer();
      await pc.setLocalDescription(sdp);
      emit("call-offer", { receiverId: otherUser.id, offer: sdp, callerName: currentUser.name, callerAvatar: currentUser.avatar, callType });
      setCallState("ringing"); playRing();
    } catch (e: any) {
      console.error("Call error:", e);
      if (e.name === "NotAllowedError") setErrorMsg("Camera/microphone permission denied. Allow access and try again.");
      else if (e.name === "NotFoundError") setErrorMsg("No camera or microphone found on this device.");
      else if (e.name === "NotReadableError") setErrorMsg("Camera/microphone is in use by another app.");
      else setErrorMsg("Could not start call: " + (e.message || "Unknown error"));
    }
  }, [callType, otherUser, currentUser, isIncoming, offer, emit, playRing, endCall, setupPC]);
  
  const answerIncomingCall = useCallback(async () => {
    setErrorMsg(null);
    setCallState("requesting-permission");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: callType === "video" });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      pcRef.current = pc;
      stream.getTracks().forEach(t => pc.addTrack(t, stream));
      setupPC(pc);
      // Set the remote offer
      if (offer) {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        await deliverPendingIce();
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        emit("call-answer", { callerId: otherUser.id, answer });
        setCallState("connecting");
      }
    } catch (e: any) {
      console.error("Answer call error:", e);
      setErrorMsg("Could not answer call: " + (e.message || "Unknown error"));
    }
  }, [callType, otherUser, offer, emit, setupPC]);

  useSocketEvent("call-accepted", async (d: { answer: RTCSessionDescriptionInit }) => { stopRing(); setCallState("connecting"); if (pcRef.current) { await pcRef.current.setRemoteDescription(new RTCSessionDescription(d.answer)); await deliverPendingIce(); } }, []);
  // ICE does NOT arrive via a direct subscription: candidates published in
  // the same transport frame as the offer fire before this modal mounts and
  // are never re-sent (transport dedupes by id). The always-mounted
  // IncomingCallListener parks them in call-signals.ts instead — attach on
  // open, drain what accumulated, then get everything live from there.
  useEffect(() => {
    if (!isOpen || !otherUser?.id) return;
    const buffered = attachIceConsumer(otherUser.id, (c) => {
      const pc = pcRef.current;
      if (!pc || !pc.remoteDescription) { pendingIceRef.current.push(c); return; }
      pc.addIceCandidate(new RTCIceCandidate(c)).catch((e) => console.warn("ICE candidate failed:", e));
    });
    buffered.forEach((c) => pendingIceRef.current.push(c));
    deliverPendingIce(); // no-op until the remote description is set
    return () => detachIceConsumer(otherUser.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, otherUser?.id]);
  useSocketEvent("call-rejected", () => { stopRing(); setCallState("ended"); setTimeout(onClose, 1500); }, []);
  useSocketEvent("call-ended", () => { endCall(); }, []);
  useEffect(() => {
    if (!isOpen) return;
    let ringTimeout: NodeJS.Timeout | null = null;
    if (!isIncoming) {
      requestPermissionAndCall();
      // Auto-end after 30 seconds if no answer
      ringTimeout = setTimeout(() => { if (callStateRef.current === "ringing") { setErrorMsg("No answer. Call timed out."); endCall(); } }, 60000);
    }
    return () => { stopRing(); if (ringTimeout) clearTimeout(ringTimeout); };
  }, [isOpen]);
  useEffect(() => { return () => { if (localStreamRef.current) { localStreamRef.current.getTracks().forEach(t => t.stop()); localStreamRef.current = null; } if (pcRef.current) { pcRef.current.close(); pcRef.current = null; } if (durationRef.current) { clearInterval(durationRef.current); durationRef.current = null; } stopRing(); }; }, [isOpen]);
  const toggleMute = () => { if (localStreamRef.current) { localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = isMuted; }); setIsMuted(!isMuted); } };
  const toggleVideo = () => { if (localStreamRef.current) { localStreamRef.current.getVideoTracks().forEach(t => { t.enabled = isVideoOff; }); setIsVideoOff(!isVideoOff); } };
  const fmt = (s: number) => Math.floor(s/60).toString().padStart(2,"0") + ":" + (s%60).toString().padStart(2,"0");
  if (!isOpen) return null;
  callStateRef.current = callState;
  const stateText = errorMsg ? errorMsg : callState === "requesting-permission" ? "Requesting camera & microphone permission..." : callState === "ringing" ? (isIncoming ? "Incoming call..." : "Ringing...") : callState === "connecting" ? "Connecting..." : callState === "connected" ? fmt(callDuration) : "Call ended";
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md mx-4">
        {/* Plays remote audio on voice calls (video calls use the <video> element) */}
        <audio ref={remoteAudioRef} autoPlay playsInline />
        {callType === "video" && (
          <div className="relative rounded-2xl overflow-hidden bg-gray-900 dark:bg-dark-900 aspect-[3/4]">
            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
            <div className="absolute top-4 right-4 w-32 h-24 rounded-xl overflow-hidden border-2 border-white/20">
              <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" style={{ transform: "scaleX(-1)" }} />
            </div>
            <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary-600 flex items-center justify-center text-white font-bold text-lg">{otherUser.name?.charAt(0)}</div>
                <div><p className="text-white font-semibold">{otherUser.name}</p><p className={errorMsg ? "text-red-400 text-sm" : "text-white/70 text-sm"}>{stateText}</p></div>
              </div>
            </div>
          </div>
        )}
        {callType === "audio" && (
          <div className="rounded-2xl bg-gray-100 dark:bg-dark-800 p-8 text-center">
            <div className="w-24 h-24 rounded-full bg-primary-600/20 flex items-center justify-center mx-auto mb-4"><div className="w-20 h-20 rounded-full bg-primary-600 flex items-center justify-center text-white text-3xl font-bold">{otherUser.name?.charAt(0)}</div></div>
            <h3 className="text-xl font-bold text-white mb-1">{otherUser.name}</h3>
            {otherUser.username ? <p className="text-gray-400 text-sm mb-2">@{otherUser.username}</p> : null}
            <p className={errorMsg ? "text-red-400 text-sm" : "text-gray-500 text-sm"}>{stateText}</p>
            {callState === "requesting-permission" && !errorMsg && (
              <div className="flex justify-center mt-4">
                <div className="w-8 h-8 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {callState === "ringing" && !errorMsg && <div className="flex justify-center gap-1 mt-4">{[0,1,2].map(i => <div key={i} className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: i*200+"ms" }} />)}</div>}
            {errorMsg && callState !== "connected" && callState !== "ended" && (
              <button onClick={requestPermissionAndCall} className="mt-4 px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-full flex items-center gap-2 mx-auto text-sm font-medium transition-all">
                <HiArrowPath className="w-4 h-4" /> Try Again
              </button>
            )}
          </div>
        )}
        <div className="flex justify-center gap-4 mt-6">
          {isIncoming && callState === "ringing" && <button onClick={answerIncomingCall} aria-label="Accept call" className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center animate-pulse"><HiPhone className="text-2xl text-white" /></button>}
          {(callState === "connected" || callState === "connecting") && <button onClick={toggleMute} className={isMuted ? "w-14 h-14 rounded-full flex items-center justify-center bg-red-500/20 text-red-400" : "w-14 h-14 rounded-full flex items-center justify-center bg-white/10 text-white hover:bg-white/20"}>{isMuted ? <HiMicrophone className="text-xl" /> : <HiMicrophone className="text-xl" />}</button>}
          {(callState === "connected" || callState === "connecting") && callType === "video" && <button onClick={toggleVideo} className={isVideoOff ? "w-14 h-14 rounded-full flex items-center justify-center bg-red-500/20 text-red-400" : "w-14 h-14 rounded-full flex items-center justify-center bg-white/10 text-white hover:bg-white/20"}>{isVideoOff ? <HiVideoCameraSlash className="text-xl" /> : <HiVideoCamera className="text-xl" />}</button>}
          {callState !== "ended" && <button onClick={endCall} aria-label="End call" className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center"><HiPhoneXMark className="text-2xl text-white" /></button>}
        </div>
      </div>
    </div>
  );
}
