// Inbound WebRTC signaling buffer.
//
// Call signals ride the shared realtime bus, which delivers each event to
// whoever is listening *at that instant* — and the transport dedupes by id,
// so a missed delivery is never re-sent. The receiving CallModal only mounts
// a few milliseconds after "incoming-call" (React render + passive effects),
// but the offer and the caller's entire ICE burst usually land in the SAME
// transport frame: every ice-candidate in that frame was published into an
// empty room and lost. Without the caller's candidates the callee's ICE
// checks have nothing to reach, and the call sits on "Connecting..." forever.
//
// IncomingCallListener is mounted from page load on every (main) page, so it
// owns receipt of ice-candidate events and parks them here until a peer
// connection exists. One call at a time, so a single live consumer suffices.

type IceHandler = (candidate: RTCIceCandidateInit) => void;

const MAX_BUFFERED = 60; // a gathering burst is a handful of candidates; this is generous
const pending = new Map<string, RTCIceCandidateInit[]>(); // peerId -> undelivered candidates
let consumer: { peerId: string; fn: IceHandler } | null = null;

/** Park a candidate — or forward it straight to a live call for that peer. */
export function stashIceCandidate(peerId: string | undefined, candidate: RTCIceCandidateInit | undefined): void {
  if (!peerId || !candidate) return;
  if (consumer && consumer.peerId === peerId) {
    try {
      consumer.fn(candidate);
    } catch (e) {
      console.warn("ICE candidate delivery failed:", e);
    }
    return;
  }
  const list = pending.get(peerId) ?? [];
  if (list.length < MAX_BUFFERED) list.push(candidate);
  pending.set(peerId, list);
}

/**
 * Go live for a peer: returns everything parked for them and switches future
 * candidates to direct delivery. Replaces any previous consumer.
 */
export function attachIceConsumer(peerId: string, fn: IceHandler): RTCIceCandidateInit[] {
  const buffered = pending.get(peerId) ?? [];
  pending.delete(peerId);
  consumer = { peerId, fn };
  return buffered;
}

/** Call ended / modal closed — drop the consumer and any stale stragglers. */
export function detachIceConsumer(peerId: string): void {
  if (consumer && consumer.peerId === peerId) consumer = null;
  pending.delete(peerId);
}
