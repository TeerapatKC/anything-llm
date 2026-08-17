import { useEffect, useState } from "react";
import { API_BASE } from "@/utils/constants";
import { baseHeaders } from "@/utils/request";

/** Fired when a newer service worker has been installed and is ready. */
export const SERVICE_WORKER_UPDATE_EVENT = "anythingllm_sw_update_available";

const PUSH_PUBKEY_URL = `${API_BASE}/web-push/pubkey`;
const PUSH_USER_SUBSCRIBE_URL = `${API_BASE}/web-push/subscribe`;

// If you update the service worker, increment this version or else
// the service worker will not be updated with new changes -
// Its version ID is independent of the app version to prevent reloading
// or cache busting when not needed.
const SW_VERSION = "1.0.0";

function log(message, ...args) {
  if (typeof message === "object") message = JSON.stringify(message, null, 2);
  console.log(`[useWebPushNotifications] ${message}`, ...args);
}

/**
 * Subscribes to push notifications for the current client - can be called multiple times without re-subscribing
 * or generating infinite tokens.
 * @returns {Promise<void>}
 */
export async function subscribeToPushNotifications(askToEnable = true) {
  try {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      log("Push notifications not supported");
      return;
    }

    if (askToEnable) {
      // Check current permission status
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        log("Notification permission not granted");
        return;
      }
    } else {
      const permission = Notification.permission;
      if (permission !== "granted") {
        log("Notification permission not granted");
        return;
      }
    }

    const publicKey = await fetch(PUSH_PUBKEY_URL, { headers: baseHeaders() })
      .then((res) => res.json())
      .then(({ publicKey }) => {
        if (!publicKey) throw new Error("No public key found or generated");
        return publicKey;
      })
      .catch(() => null);

    if (!publicKey) return log("No public key found or generated");

    const swReg = await navigator.serviceWorker.register(
      `/service-workers/push-notifications.js?v=${SW_VERSION}`
    );

    // Check for updates
    swReg.addEventListener("updatefound", () => {
      const newWorker = swReg.installing;
      log("Service worker update found");

      newWorker.addEventListener("statechange", () => {
        if (
          newWorker.state === "installed" &&
          navigator.serviceWorker.controller
        ) {
          // New service worker is installed and ready
          log("New service worker installed, ready to activate");

          // Surfaced as state for a component to confirm - this runs inside a
          // service worker listener where there is no React tree to render into.
          window.dispatchEvent(new CustomEvent(SERVICE_WORKER_UPDATE_EVENT));
        }
      });
    });

    // Handle service worker updates
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      log("Service worker controller changed");
    });

    if (swReg.installing) {
      await new Promise((resolve) => {
        swReg.installing.addEventListener("statechange", () => {
          if (swReg.installing?.state === "activated") resolve();
        });
      });
    } else if (swReg.waiting) {
      await new Promise((resolve) => {
        swReg.waiting.addEventListener("statechange", () => {
          if (swReg.waiting?.state === "activated") resolve();
        });
      });
    }

    const subscription = await swReg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
    await fetch(PUSH_USER_SUBSCRIBE_URL, {
      method: "POST",
      body: JSON.stringify(subscription),
      headers: baseHeaders(),
    });
  } catch (error) {
    log("Error subscribing to push notifications", error);
  }
}

/**
 * Hook that registers a service worker for push notifications, and reports when a
 * newer version of the app has been installed so the caller can offer a reload.
 * @returns {{updateAvailable: boolean, applyUpdate: () => void, dismissUpdate: () => void}}
 */
export default function useWebPushNotifications(askToEnable = true) {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    subscribeToPushNotifications(askToEnable);
  }, []);

  useEffect(() => {
    const onUpdate = () => setUpdateAvailable(true);
    window.addEventListener(SERVICE_WORKER_UPDATE_EVENT, onUpdate);
    return () =>
      window.removeEventListener(SERVICE_WORKER_UPDATE_EVENT, onUpdate);
  }, []);

  return {
    updateAvailable,
    applyUpdate: () => window.location.reload(),
    dismissUpdate: () => setUpdateAvailable(false),
  };
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, "+")
    .replace(/_/g, "/");
  const rawData = atob(base64);
  return new Uint8Array([...rawData].map((char) => char.charCodeAt(0)));
}
