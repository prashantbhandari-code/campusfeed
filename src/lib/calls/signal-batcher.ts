import prisma from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";

// Each receiverId gets its own pending buffer + flush interval
const pending = new Map<string, Array<{ type: string; payload: Prisma.InputJsonValue; senderId: string; receiverId: string }>>();
const timers = new Map<string, NodeJS.Timeout>();

const FLUSH_INTERVAL_MS = 1000; // flush at most once per second
const MAX_PENDING = 50; // cap batch size to avoid unbounded growth

/**
 * Add a ICE candidate signal to the batch.
 * The caller is responsible for starting the flush timer via start().
 */
export function addSignal(
  receiverId: string,
  type: string,
  payload: Prisma.InputJsonValue,
  senderId: string
) {
  if (!pending.has(receiverId)) pending.set(receiverId, []);
  const buf = pending.get(receiverId)!;

  if (buf.length >= MAX_PENDING) {
    // Buffer full – flush immediately and reset
    void flushSignals(receiverId);
    pending.set(receiverId, [buf.shift()!]); // keep one slot open
  }
  buf.push({ type, payload, senderId, receiverId });
}

/** Start the periodic flush timer for a receiverId. Idempotent. */
export function startFlush(receiverId: string) {
  if (timers.has(receiverId)) return;
  timers.set(receiverId, setInterval(() => void flushSignals(receiverId), FLUSH_INTERVAL_MS));
}

/** Stop the timer and flush any remaining pending signals. */
export function stopFlush(receiverId: string) {
  clearInterval(timers.get(receiverId)!);
  timers.delete(receiverId);
  void flushSignals(receiverId);
  pending.delete(receiverId);
}

/** Flush all pending signals for receiverId into the DB. */
async function flushSignals(receiverId: string) {
  const entries = pending.get(receiverId);
  if (!entries || entries.length === 0) return;

  pending.delete(receiverId);

  // Group by senderId so we don't flood the DB with cross-talk signals
  const bySender = new Map<string, typeof entries>();
  for (const e of entries) {
    const s = bySender.get(e.senderId) || [];
    s.push(e);
    bySender.set(e.senderId, s);
  }

  // Write each sender's batch
  for (const [senderId, senderEntries] of bySender) {
    await prisma.callSignal.createMany({
      data: senderEntries.map((e) => ({
        senderId,
        receiverId,
        type: e.type,
        payload: e.payload,
        createdAt: new Date(),
      })),
      skipDuplicates: true,
    });
  }
}