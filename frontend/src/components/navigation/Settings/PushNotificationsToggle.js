"use client";

import { useState, useEffect } from "react";
import { getAuth } from "firebase/auth";
import ToggleSwitch from "../../ui/ToggleSwitch";
import {
  isPushNotificationSupported,
  enablePushNotifications,
  testPushNotification,
} from "../../../services/firebaseMessaging";
import {
  getUserSettings,
  updateUserSettings,
  removeFcmToken,
} from "../../../services/userSettingsService";

export default function PushNotificationsToggle() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState("default");
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Listen to auth state changes
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Check initial permission state and user settings
  useEffect(() => {
    const checkPermissionAndSettings = async () => {
      if (typeof window !== "undefined" && await isPushNotificationSupported()) {
        const currentPermission = "Notification" in window ? Notification.permission : "default";
        setPermission(currentPermission);

        // Fetch user settings from backend
        if (currentUser?.uid) {
          try {
            const settings = await getUserSettings(currentUser.uid);
            setIsSubscribed(settings.pushNotificationsEnabled || false);
          } catch (err) {
            console.error("Error fetching user settings:", err);
          }
        }
      }
    };

    checkPermissionAndSettings();
  }, [currentUser?.uid]);

  const handleToggle = async (enabled) => {
    if (!currentUser?.uid) {
      setError("You must be logged in to change notification settings");
      return;
    }

    const supported = await isPushNotificationSupported();
    if (!supported) {
      setError("Push notifications are not supported in this browser");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (enabled) {
        // Enable push notifications (requests permission, gets token, registers with backend)
        const result = await enablePushNotifications(currentUser.uid);
        
        if (result.success) {
          setIsSubscribed(true);
          setPermission("granted");
          setSuccessMessage("Push notifications enabled successfully!");
          setTimeout(() => setSuccessMessage(null), 3000);
        } else {
          setError(result.message || "Failed to enable push notifications");
          setIsSubscribed(false);
        }
      } else {
        // Disable push notifications
        await removeFcmToken(currentUser.uid);
        
        // Also update user settings
        const settings = await getUserSettings(currentUser.uid);
        await updateUserSettings(currentUser.uid, {
          ...settings,
          pushNotificationsEnabled: false,
        });
        
        setIsSubscribed(false);
        setSuccessMessage("Push notifications disabled.");
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err) {
      console.error("Error toggling push notifications:", err);
      setError(err.message || "Failed to update notification settings");
      setIsSubscribed(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestNotification = async () => {
    if (!isSubscribed) {
      setError("Please enable push notifications first");
      return;
    }

    setIsTesting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await testPushNotification();
      setSuccessMessage("Test notification sent! Check your notifications.");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error("Error sending test notification:", err);
      setError("Failed to send test notification");
    } finally {
      setIsTesting(false);
    }
  };

  // Get status message based on permission
  const getStatusMessage = async () => {
    const supported = await isPushNotificationSupported();
    
    if (!supported) {
      return "Your browser doesn't support push notifications.";
    }

    if (permission === "denied") {
      return "Push notifications are blocked. Please enable them in your browser settings.";
    }

    if (permission === "granted" && isSubscribed) {
      return "You will receive push notifications for events and announcements.";
    }

    return "Enable push notifications to stay updated with important alerts.";
  };

  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    getStatusMessage().then(setStatusMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permission, isSubscribed]);

  const isDisabled = permission === "denied" || isLoading;

  return (
    <div className="space-y-3 sm:space-y-4">
      <ToggleSwitch
        id="push-notifications"
        checked={isSubscribed}
        onChange={handleToggle}
        disabled={isDisabled}
        label="Enable push notifications"
      />

      <div
        className={`text-xs sm:text-sm break-words ${
          permission === "denied"
            ? "text-red-600 dark:text-red-400"
            : "text-gray-600 dark:text-gray-400"
        }`}
      >
        {statusMessage}
      </div>

      {successMessage && (
        <div className="p-2 sm:p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-xs sm:text-sm text-green-800 dark:text-green-200 break-words">
          {successMessage}
        </div>
      )}

      {error && (
        <div className="text-xs sm:text-sm text-red-600 dark:text-red-400 p-2 sm:p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg break-words" role="alert">
          {error}
        </div>
      )}

      {isSubscribed && permission === "granted" && (
        <button
          onClick={handleTestNotification}
          disabled={isTesting}
          className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm font-medium touch-manipulation"
        >
          {isTesting ? "Sending..." : "Send Test Notification"}
        </button>
      )}

      {permission === "denied" && (
        <div className="p-3 sm:p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <p className="text-xs sm:text-sm text-amber-800 dark:text-amber-200 font-semibold">
            How to enable:
          </p>
          <ul className="text-xs sm:text-sm text-amber-700 dark:text-amber-300 mt-2 ml-4 list-disc space-y-1">
            <li className="break-words">Click the lock icon in your browser&apos;s address bar</li>
            <li className="break-words">Find &quot;Notifications&quot; in the permissions list</li>
            <li className="break-words">Change the setting to &quot;Allow&quot;</li>
            <li className="break-words">Refresh this page and toggle push notifications on</li>
          </ul>
        </div>
      )}
    </div>
  );
}
