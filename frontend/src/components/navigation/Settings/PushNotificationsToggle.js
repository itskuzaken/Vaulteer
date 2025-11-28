"use client";

import { useState, useEffect } from "react";
import ToggleSwitch from "../../ui/ToggleSwitch";
import {
  subscribeToFCM,
  unsubscribeFromFCM,
  isPushSupported,
  getNotificationPermission,
} from "../../../services/notificationService";

export default function PushNotificationsToggle() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Check initial permission state
  useEffect(() => {
    if (typeof window !== "undefined" && isPushSupported()) {
      const currentPermission = getNotificationPermission();
      setPermission(currentPermission);

      // If granted, assume subscribed (in full implementation, check backend)
      if (currentPermission === "granted") {
        setIsSubscribed(true);
      }
    }
  }, []);

  const handleToggle = async (enabled) => {
    if (!isPushSupported()) {
      setError("Push notifications are not supported in this browser");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (enabled) {
        // Subscribe to push notifications
        const token = await subscribeToFCM();
        console.log("Subscribed with token:", token);
        setIsSubscribed(true);
        setPermission("granted");
      } else {
        // Unsubscribe from push notifications
        await unsubscribeFromFCM();
        setIsSubscribed(false);
      }
    } catch (err) {
      console.error("Error toggling push notifications:", err);
      setError(err.message);
      setIsSubscribed(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Get status message based on permission
  const getStatusMessage = () => {
    if (!isPushSupported()) {
      return "Your browser doesn't support push notifications.";
    }

    if (permission === "denied") {
      return "Push notifications are blocked. Please enable them in your browser settings.";
    }

    if (permission === "granted" && isSubscribed) {
      return "You will receive push notifications for important updates.";
    }

    return "Enable push notifications to stay updated with important alerts.";
  };

  const isDisabled = !isPushSupported() || permission === "denied" || isLoading;

  return (
    <div className="space-y-4">
      <ToggleSwitch
        id="push-notifications"
        checked={isSubscribed}
        onChange={handleToggle}
        disabled={isDisabled}
        label="Enable push notifications"
      />

      <div
        className={`text-sm ${
          permission === "denied" || !isPushSupported()
            ? "text-red-600 dark:text-red-400"
            : "text-gray-600 dark:text-gray-400"
        }`}
      >
        {getStatusMessage()}
      </div>

      {error && (
        <div className="text-sm text-red-600 dark:text-red-400" role="alert">
          Error: {error}
        </div>
      )}

      {permission === "denied" && (
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <strong>How to enable:</strong>
          </p>
          <ul className="text-sm text-amber-700 dark:text-amber-300 mt-2 ml-4 list-disc space-y-1">
            <li>Click the lock icon in your browser&apos;s address bar</li>
            <li>Find &quot;Notifications&quot; in the permissions list</li>
            <li>Change the setting to &quot;Allow&quot;</li>
            <li>Refresh this page</li>
          </ul>
        </div>
      )}
    </div>
  );
}
