"use client";

import { useState, useEffect } from "react";
import { getAuth } from "firebase/auth";
import Appearance from "./Appearance";
import PushNotificationsToggle from "./PushNotificationsToggle";
import EmailNotificationsToggle from "./EmailNotificationsToggle";
import LanguageAndRegion from "./LanguageAndRegion";
import {
  IoNotificationsOutline,
  IoMailOutline,
  IoColorPaletteOutline,
  IoGlobeOutline,
  IoCheckmarkCircleOutline,
} from "react-icons/io5";

export default function UserSettings() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Listen to auth state changes
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
      setIsInitializing(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-6">
      <div className="max-w-4xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Settings
          </h1>
          <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-400">
            Manage your account preferences and notification settings
          </p>
          {currentUser && (
            <div className="mt-3 flex items-center gap-2 text-xs sm:text-sm text-green-600 dark:text-green-400">
              <IoCheckmarkCircleOutline className="w-4 h-4" />
              <span>Settings are automatically synced to your account</span>
            </div>
          )}
        </div>

        {/* Show loading state while checking auth */}
        {isInitializing ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
          </div>
        ) : null}

        {/* Settings Sections */}
        <div className="space-y-4 sm:space-y-6">
          {/* Appearance Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 sm:p-6">
            <div className="flex items-start sm:items-center gap-2 sm:gap-3 mb-4">
              <IoColorPaletteOutline className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5 sm:mt-0" />
              <div className="min-w-0 flex-1">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                  Appearance
                </h2>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                  Customize how Vaulteer looks on your device
                </p>
              </div>
            </div>
            <Appearance />
          </div>

          {/* Notifications Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 sm:p-6">
            <div className="flex items-start sm:items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              <IoNotificationsOutline className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5 sm:mt-0" />
              <div className="min-w-0 flex-1">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                  Notifications
                </h2>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                  Manage how you receive updates and alerts
                </p>
              </div>
            </div>

            <div className="space-y-6 sm:space-y-8">
              {/* Push Notifications */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 sm:mb-3 flex items-center gap-2">
                  <IoNotificationsOutline className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">Push Notifications</span>
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-3 sm:mb-4">
                  Receive instant browser notifications for events and announcements
                </p>
                <PushNotificationsToggle />
              </div>

              {/* Divider */}
              <div className="border-t border-gray-200 dark:border-gray-700"></div>

              {/* Email Notifications */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 sm:mb-3 flex items-center gap-2">
                  <IoMailOutline className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">Email Notifications</span>
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-3 sm:mb-4">
                  Receive email updates about events and announcements
                </p>
                <EmailNotificationsToggle />
              </div>
            </div>
          </div>

          {/* Language & Region Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 sm:p-6">
            <div className="flex items-start sm:items-center gap-2 sm:gap-3 mb-4">
              <IoGlobeOutline className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5 sm:mt-0" />
              <div className="min-w-0 flex-1">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                  Language & Region
                </h2>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                  Set your preferred language and timezone
                </p>
              </div>
            </div>
            <LanguageAndRegion />
          </div>
        </div>
      </div>
    </div>
  );
}
