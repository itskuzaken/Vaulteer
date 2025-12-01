"use client";

import { useState, useEffect } from "react";
import { getAuth } from "firebase/auth";
import {
  getUserSettings,
  updateUserSettings,
} from "../../../services/userSettingsService";
import { IoGlobeOutline, IoTimeOutline } from "react-icons/io5";

export default function LanguageAndRegion() {
  const [currentUser, setCurrentUser] = useState(null);
  const [settings, setSettings] = useState({
    language: "en",
    timezone: "UTC",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [error, setError] = useState(null);

  // Listen to auth state changes
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Load user settings
  useEffect(() => {
    const loadSettings = async () => {
      if (currentUser?.uid) {
        try {
          const userSettings = await getUserSettings(currentUser.uid);
          setSettings({
            language: userSettings.language || "en",
            timezone: userSettings.timezone || "UTC",
          });
        } catch (err) {
          console.error("Error fetching user settings:", err);
        }
      }
    };

    loadSettings();
  }, [currentUser?.uid]);

  const handleSettingChange = async (key, value) => {
    if (!currentUser?.uid) {
      setError("You must be logged in to change settings");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const currentSettings = await getUserSettings(currentUser.uid);
      await updateUserSettings(currentUser.uid, {
        ...currentSettings,
        [key]: value,
      });

      setSettings((prev) => ({ ...prev, [key]: value }));
      setSuccessMessage("Settings saved successfully!");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error("Error updating settings:", err);
      setError("Failed to save settings. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const languages = [
    { value: "en", label: "English" },
    { value: "es", label: "Español" },
    { value: "fr", label: "Français" },
    { value: "de", label: "Deutsch" },
    { value: "it", label: "Italiano" },
    { value: "pt", label: "Português" },
    { value: "zh", label: "中文" },
    { value: "ja", label: "日本語" },
  ];

  const timezones = [
    { value: "UTC", label: "UTC (Coordinated Universal Time)" },
    { value: "America/New_York", label: "Eastern Time (ET)" },
    { value: "America/Chicago", label: "Central Time (CT)" },
    { value: "America/Denver", label: "Mountain Time (MT)" },
    { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
    { value: "America/Phoenix", label: "Arizona Time (MST)" },
    { value: "America/Anchorage", label: "Alaska Time (AKT)" },
    { value: "Pacific/Honolulu", label: "Hawaii Time (HST)" },
    { value: "Europe/London", label: "London (GMT/BST)" },
    { value: "Europe/Paris", label: "Paris (CET/CEST)" },
    { value: "Europe/Berlin", label: "Berlin (CET/CEST)" },
    { value: "Asia/Tokyo", label: "Tokyo (JST)" },
    { value: "Asia/Shanghai", label: "Shanghai (CST)" },
    { value: "Asia/Dubai", label: "Dubai (GST)" },
    { value: "Australia/Sydney", label: "Sydney (AEDT/AEST)" },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Success Message */}
      {successMessage && (
        <div className="p-2 sm:p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-xs sm:text-sm text-green-800 dark:text-green-200 break-words">
          {successMessage}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div
          className="text-xs sm:text-sm text-red-600 dark:text-red-400 p-2 sm:p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg break-words"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* Language Selection */}
      <div className="space-y-2 sm:space-y-3">
        <label className="flex items-center gap-2 text-xs sm:text-sm font-medium text-gray-900 dark:text-white">
          <IoGlobeOutline className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">Language</span>
        </label>
        <select
          value={settings.language}
          onChange={(e) => handleSettingChange("language", e.target.value)}
          disabled={isLoading}
          className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {languages.map((lang) => (
            <option key={lang.value} value={lang.value}>
              {lang.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-500 dark:text-gray-400 break-words">
          Select your preferred language for the interface
        </p>
      </div>

      {/* Timezone Selection */}
      <div className="space-y-2 sm:space-y-3">
        <label className="flex items-center gap-2 text-xs sm:text-sm font-medium text-gray-900 dark:text-white">
          <IoTimeOutline className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">Timezone</span>
        </label>
        <select
          value={settings.timezone}
          onChange={(e) => handleSettingChange("timezone", e.target.value)}
          disabled={isLoading}
          className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {timezones.map((tz) => (
            <option key={tz.value} value={tz.value}>
              {tz.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-500 dark:text-gray-400 break-words">
          Used for displaying dates and times in your local timezone
        </p>
      </div>
    </div>
  );
}
