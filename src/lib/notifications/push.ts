// Server-side Web Push delivery. Fire-and-forget: callers must never fail
// their own request because push delivery failed.
import webpush from "web-push";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_SUBJECT = "mailto:admin@campusfeed.app";

const configured = Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);

export async function sendPush(
  userId: string,
  payload: { title: string; body: string; url?: string }
) {
  if (!configured) return;

  try {
    const prisma = (await import("@/lib/db/prisma")).default;
    const subs = await prisma.pushSubscription.findMany({ where: { userId } });
    if (!subs.length) return;

    const message = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url || "/notifications",
      icon: "/icon-192x192.png",
      badge: "/badge-72x72.png",
      tag: "campusfeed",
    });

    const results = await Promise.allSettled(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            message,
            { vapidDetails: { subject: VAPID_SUBJECT, publicKey: VAPID_PUBLIC_KEY, privateKey: VAPID_PRIVATE_KEY } }
          );
        } catch (err: any) {
          // Endpoint gone (unsubscribed elsewhere / browser data cleared) — prune it.
          if (err?.statusCode === 404 || err?.statusCode === 410) {
            await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
          }
        }
      })
    );
    return results;
  } catch (err) {
    console.error("sendPush failed:", err);
  }
}
