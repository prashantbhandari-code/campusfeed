"use client";

import { useEffect, useRef } from "react";
import { useSession } from "@/lib/auth/session";
import { useCall } from "./CallProvider";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";

export default function CapacitorCallListener() {
  const { data: session } = useSession();
  const user = session?.user;
  const { receiveIncomingCall } = useCall();
  const isCapacitor = Capacitor.isNativePlatform();
  const initialized = useRef(false);

  useEffect(() => {
    if (!user || !isCapacitor) return;

    let pushReceivedListener: { remove: () => Promise<void> } | null = null;
    let pushActionListener: { remove: () => Promise<void> } | null = null;

    const setup = async () => {
      if (initialized.current) return;
      initialized.current = true;

      try {
        const permResult = await PushNotifications.requestPermissions();
        if (permResult.receive === "granted") {
          await PushNotifications.register();
        }
      } catch (error) {
        console.error("Push notification init failed:", error);
      }

      pushReceivedListener = await PushNotifications.addListener("pushNotificationReceived", (notification) => {
        const data = notification.data;
        if (data?.type === "incoming-call") {
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
        }
      });

      pushActionListener = await PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
        const data = action.notification.data;
        if (data?.type === "incoming-call") {
          if (action.actionId === "tap" || action.actionId === "ACTION_ANSWER") {
            // App opened from notification, call will be handled by onNewIntent
          }
        }
      });
    };

    setup();

    return () => {
      pushReceivedListener?.remove();
      pushActionListener?.remove();
    };
  }, [user, receiveIncomingCall, isCapacitor]);

  // Listen for call actions from native (Answer/Decline buttons)
  useEffect(() => {
    if (!isCapacitor) return;

    const handleCallAction = (event: CustomEvent) => {
      const { action, callerId } = event.detail;
      console.log("Capacitor call action:", action, callerId);
      // Answer/decline handling is implemented in CallModal via CallProvider
    };

    window.addEventListener("capacitor:callAction", handleCallAction as EventListener);
    return () => window.removeEventListener("capacitor:callAction", handleCallAction as EventListener);
  }, [isCapacitor]);

  return null;
}