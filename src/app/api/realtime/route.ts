export const dynamic = "force-dynamic";
export const maxDuration = 60; // Vercel cap; the stream self-closes well before this

import { NextRequest } from 'next/server';
import { getUserIdFromCookieHeader } from '@/lib/session-token';
import { collectDelta } from '@/lib/realtime/collect-delta';
import { freshTypingFor } from '@/lib/realtime/typing-store';

// Server-Sent Events stream: the primary realtime transport on Vercel.
//
// Vercel serverless functions are killed after a short window, so the stream
// is BOUNDED: it sends delta frames each tick, then a final "bye" frame
// carrying the client's next cursor, and closes. The browser's EventSource
// reconnects automatically (native retry) and the next connection continues
// from that cursor — so near-instant delivery costs one invocation per ~9s
// of activity instead of one per 2s poll (~78% fewer invocations per tab,
// and each one does the same work the old poll did).
//
// Worst-case delivery: a message written just after the stream closed is
// picked up as soon as EventSource reconnects — typically under a second.

const TICK_MS = 1000; // delta scan interval while the stream is open
const STREAM_BUDGET_MS = 9000; // self-close before Vercel's kill window
const IDLE_LIMIT = 8; // close after this many consecutive empty ticks

function sseFrame(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function GET(request: NextRequest) {
  const cookieHeader = request.headers.get('cookie') || '';
  const userId = getUserIdFromCookieHeader(cookieHeader);

  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  const url = new URL(request.url);
  // Client sends back the cursor from the previous stream's bye frame.
  const since = parseInt(url.searchParams.get('since') || '0') || 0;

  const encoder = new TextEncoder();
  const startedAt = Date.now();

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      let timer: ReturnType<typeof setInterval> | null = null;
      const close = () => {
        if (closed) return;
        closed = true;
        if (timer) clearInterval(timer);
        try {
          controller.close();
        } catch {
          /* already closed by the platform */
        }
      };

      let cursor = since;
      let idleTicks = 0;
      // Track unread counts across ticks so badge changes emit as deltas
      // even when nothing else moved.
      let lastUnreadNotifications: number | null = null;
      let lastUnreadMessages: number | null = null;

      const sendDelta = async () => {
        if (closed) return;
        const now = Date.now();
        try {
          const delta = await collectDelta(userId, cursor, now);
          cursor = delta.nextSince;

          const hasContent =
            delta.messages.length > 0 ||
            delta.changedMessages.length > 0 ||
            delta.groupMessages.length > 0 ||
            delta.changedGroupMessages.length > 0 ||
            delta.reactions.length > 0 ||
            delta.callSignals.length > 0 ||
            delta.unreadNotifications !== lastUnreadNotifications ||
            delta.unreadMessages !== lastUnreadMessages;

          if (hasContent) {
            idleTicks = 0;
            lastUnreadNotifications = delta.unreadNotifications;
            lastUnreadMessages = delta.unreadMessages;
            controller.enqueue(encoder.encode(sseFrame("delta", { ...delta, typing: freshTypingFor(userId) })));
          } else {
            idleTicks++;
            // Always send a typing frame on quiet ticks — even an empty one —
            // so the client's differ notices a typist going silent within a
            // second instead of whenever the next content frame happens.
            controller.enqueue(encoder.encode(sseFrame("typing", { typing: freshTypingFor(userId) })));
          }
        } catch (error) {
          console.error("SSE delta error:", error);
        }

        if (closed) return; // aborted while the delta was in flight
        if (Date.now() - startedAt >= STREAM_BUDGET_MS || idleTicks >= IDLE_LIMIT) {
          try {
            controller.enqueue(encoder.encode(sseFrame("bye", { since: cursor })));
          } catch { /* platform closed first */ }
          close();
        }
      };

      // First delta ships immediately so a reconnecting tab catches up at once.
      await sendDelta();
      if (!closed) {
        timer = setInterval(sendDelta, TICK_MS);
        // Hard stop backstop if the platform doesn't reclaim us cleanly.
        setTimeout(close, 55_000);
        // Abort when the client disconnects (tab closed, network switch).
        request.signal.addEventListener("abort", close);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
