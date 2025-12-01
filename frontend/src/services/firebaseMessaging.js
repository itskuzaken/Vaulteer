import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { auth } from "./firebase";
import { saveFcmToken } from "./userSettingsService";

let messaging = null;
let vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

/**
 * Initialize Firebase Messaging
 * Should be called after Firebase app is initialized
 */
export function initializeMessaging() {
  if (typeof window === "undefined") {
    // Server-side rendering
    return null;
  }

  if (!messaging) {
    try {
      const { app } = require("@/services/firebase");
      messaging = getMessaging(app);
      console.log("Firebase Messaging initialized");
    } catch (error) {
      console.error("Error initializing Firebase Messaging:", error);
    }
  }

  return messaging;
}

/**
 * Check if browser supports push notifications
 */
export function isPushNotificationSupported() {
  return typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator;
}

/**
 * Check current notification permission status
 */
export function getNotificationPermission() {
  if (!isPushNotificationSupported()) {
    return "unsupported";
  }
  return Notification.permission; // "granted", "denied", or "default"
}

/**
 * Request notification permission from user
 * @returns {Promise<string>} Permission status
 */
export async function requestNotificationPermission() {
  if (!isPushNotificationSupported()) {
    throw new Error("Push notifications are not supported in this browser");
  }

  const permission = await Notification.requestPermission();
  return permission; // "granted", "denied", or "default"
}

/**
 * Get FCM device token
 * @returns {Promise<string>} FCM token
 */
export async function getDeviceToken() {
  try {
    const msg = initializeMessaging();
    if (!msg) {
      throw new Error("Firebase Messaging not initialized");
    }

    if (Notification.permission !== "granted") {
      throw new Error("Notification permission not granted");
    }

    // Register service worker
    const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    await navigator.serviceWorker.ready;

    // Get FCM token
    const token = await getToken(msg, {
      vapidKey: vapidKey,
      serviceWorkerRegistration: registration,
    });

    if (!token) {
      throw new Error("Failed to get FCM token");
    }

    return token;
  } catch (error) {
    console.error("Error getting device token:", error);
    throw error;
  }
}

/**
 * Register FCM token with backend
 * @param {string} token - FCM token
 * @returns {Promise<Object>} Success response
 */
export async function registerFcmToken(token) {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error("User not authenticated");
    }

    await saveFcmToken(user.uid, token);
    console.log("FCM token registered successfully");
    return { success: true };
  } catch (error) {
    console.error("Error registering FCM token:", error);
    throw error;
  }
}

/**
 * Enable push notifications (request permission, get token, register with backend)
 * @param {Function} onNotificationCallback - Callback for foreground notifications
 * @returns {Promise<Object>} Result with token and status
 */
export async function enablePushNotifications(onNotificationCallback) {
  try {
    // Check support
    if (!isPushNotificationSupported()) {
      throw new Error("Push notifications not supported");
    }

    // Request permission
    const permission = await requestNotificationPermission();
    if (permission !== "granted") {
      throw new Error("Notification permission denied");
    }

    // Get token
    const token = await getDeviceToken();

    // Register with backend
    await registerFcmToken(token);

    // Setup foreground message handler
    if (onNotificationCallback) {
      setupForegroundMessageHandler(onNotificationCallback);
    }

    return {
      success: true,
      token,
      permission,
    };
  } catch (error) {
    console.error("Error enabling push notifications:", error);
    throw error;
  }
}

/**
 * Setup handler for foreground messages (when app is in focus)
 * @param {Function} callback - Callback function to handle notification
 */
export function setupForegroundMessageHandler(callback) {
  const msg = initializeMessaging();
  if (!msg) {
    console.warn("Firebase Messaging not initialized");
    return;
  }

  onMessage(msg, (payload) => {
    console.log("Foreground message received:", payload);

    // Extract notification data
    const { title, body } = payload.notification || {};
    const data = payload.data || {};

    // Call callback with notification details
    if (callback) {
      callback({
        title: title || "New Notification",
        message: body || "",
        data,
      });
    }

    // Optionally show browser notification even in foreground
    if (Notification.permission === "granted" && title) {
      new Notification(title, {
        body: body || "",
        icon: "/icon-192x192.png",
        badge: "/icon-96x96.png",
        data: data,
      });
    }
  });
}

/**
 * Handle token refresh
 * FCM tokens can expire and need to be refreshed
 */
export async function handleTokenRefresh() {
  try {
    const token = await getDeviceToken();
    await registerFcmToken(token);
    console.log("FCM token refreshed and re-registered");
    return token;
  } catch (error) {
    console.error("Error refreshing FCM token:", error);
    throw error;
  }
}

/**
 * Test push notification (for debugging)
 */
export async function testPushNotification() {
  if (Notification.permission !== "granted") {
    console.warn("Notification permission not granted");
    return;
  }

  const notification = new Notification("Test Notification", {
    body: "This is a test notification from Vaulteer",
    icon: "/icon-192x192.png",
    badge: "/icon-96x96.png",
  });

  notification.onclick = () => {
    window.focus();
    notification.close();
  };
}
