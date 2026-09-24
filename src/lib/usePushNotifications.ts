"use client";

import { useState, useCallback } from "react";
import toast from "react-hot-toast";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/** navigator.serviceWorker.ready never rejects — it hangs if registration failed. */
function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(message)), ms)),
  ]);
}

function describeError(error: unknown): string {
  if (error instanceof Error) {
    const name = error.name && error.name !== "Error" ? `${error.name}: ` : "";
    return `${name}${error.message}`;
  }
  return String(error);
}

export function usePushNotifications() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  const subscribe = useCallback(async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      toast.error("Push notifications are not supported in this browser");
      return false;
    }

    // iOS Safari only allows web push for sites added to the Home Screen.
    const isIOS =
      /iP(hone|ad|od)/.test(navigator.userAgent) &&
      !(navigator as any).standalone &&
      !window.matchMedia("(display-mode: standalone)").matches;
    if (isIOS) {
      toast.error(
        "On iPhone/iPad, tap Share → Add to Home Screen, then open Campusfeed from your home screen to enable notifications",
        { duration: 8000 }
      );
      return false;
    }

    if (typeof Notification === "undefined") {
      toast.error("This browser doesn't support notifications — try Chrome or Safari");
      return false;
    }

    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.error(
          permission === "denied"
            ? "Notifications are blocked — allow them in your browser's site settings"
            : "Notification permission was not granted"
        );
        setLoading(false);
        return false;
      }

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        toast.error("Push notifications not configured");
        setLoading(false);
        return false;
      }

      const registration = await withTimeout(
        navigator.serviceWorker.ready,
        10000,
        "Service worker did not start — reload the page and try again"
      );
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      const sub = subscription.toJSON();
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          p256dh: sub.keys?.p256dh,
          auth: sub.keys?.auth,
        }),
      });
      if (!res.ok) {
        let serverError = `server responded ${res.status}`;
        try {
          const data = await res.json();
          if (data?.error) serverError = data.error;
        } catch { /* keep status message */ }
        if (res.status === 401) serverError = "session expired — log in again and retry";
        throw new Error(serverError);
      }

      setIsSubscribed(true);
      toast.success("Push notifications enabled!");
      setLoading(false);
      return true;
    } catch (error) {
      console.error("Push subscription failed:", error);
      toast.error(`Couldn't enable notifications — ${describeError(error)}`, { duration: 8000 });
      setLoading(false);
      return false;
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    setLoading(true);
    try {
      const registration = await withTimeout(
        navigator.serviceWorker.ready,
        10000,
        "Service worker did not start — reload the page and try again"
      );
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint }),
        });
      }
      setIsSubscribed(false);
      toast.success("Push notifications disabled");
      setLoading(false);
    } catch (error) {
      console.error("Push unsubscribe failed:", error);
      toast.error(`Couldn't disable notifications — ${describeError(error)}`, { duration: 8000 });
      setLoading(false);
    }
  }, []);

  const checkSubscription = useCallback(async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) { console.error("Operation failed:", error); }
  }, []);

  return { isSubscribed, loading, subscribe, unsubscribe, checkSubscription };
}
