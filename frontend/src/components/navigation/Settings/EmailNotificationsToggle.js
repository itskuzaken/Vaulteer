"use client";

import { useState, useEffect } from "react";
import { getAuth } from "firebase/auth";
import ToggleSwitch from "../../ui/ToggleSwitch";
import {
  getUserSettings,
  updateUserSettings,
} from "../../../services/userSettingsService";

export default function EmailNotificationsToggle() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
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

  // Check initial user settings
  useEffect(() => {
    const loadSettings = async () => {
      if (currentUser?.uid) {
        try {
          const settings = await getUserSettings(currentUser.uid);
          setIsEnabled(settings.emailNotificationsEnabled !== false); // Default to true
        } catch (err) {
          console.error("Error fetching user settings:", err);
        }
      }
    };

    loadSettings();
  }, [currentUser?.uid]);

  const handleToggle = async (enabled) => {
    if (!currentUser?.uid) {
      setError("You must be logged in to change notification settings");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const settings = await getUserSettings(currentUser.uid);
      await updateUserSettings(currentUser.uid, {
        ...settings,
        emailNotificationsEnabled: enabled,
      });
      
      setIsEnabled(enabled);
      setSuccessMessage(
        enabled
          ? "Email notifications enabled!"
          : "Email notifications disabled."
      );
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error("Error toggling email notifications:", err);
      setError(err.message || "Failed to update email notification settings");
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusMessage = () => {
    if (isEnabled) {
      return "You will receive email notifications for events and announcements.";
    }
    return "Enable email notifications to receive updates via email.";
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      <ToggleSwitch
        id="email-notifications"
        checked={isEnabled}
        onChange={handleToggle}
        disabled={isLoading}
        label="Enable email notifications"
      />

      <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 break-words">
        {getStatusMessage()}
      </div>

      {successMessage && (
        <div className="p-2 sm:p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-xs sm:text-sm text-green-800 dark:text-green-200 break-words">
          {successMessage}
        </div>
      )}

      {error && (
        <div
          className="text-xs sm:text-sm text-red-600 dark:text-red-400 p-2 sm:p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg break-words"
          role="alert"
        >
          {error}
        </div>
      )}
    </div>
  );
}
