// One wire format for realtime events. Both transports (WebSocket bridge and
// HTTP polling) publish here; React hooks subscribe from here. The shape of
// the "socket-message" channel is owned by this file alone.

const CHANNEL = "socket-message";

export function publish(event: string, data?: any): void {
  window.dispatchEvent(new CustomEvent(CHANNEL, { detail: { event, data } }));
}

export function subscribe(event: string, handler: (data: any) => void): () => void {
  const listener = (e: Event) => {
    const detail = (e as CustomEvent).detail;
    if (detail.event === event) handler(detail.data);
  };
  window.addEventListener(CHANNEL, listener);
  return () => window.removeEventListener(CHANNEL, listener);
}
