"use client";

import Appearance from "./Appearance";
import PushNotificationsToggle from "./PushNotificationsToggle";

export default function UserSettings() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Settings
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Manage your account preferences and settings
          </p>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 gap-8">
          {/* Combined Main Content Area */}
          <main className="lg:col-span-12">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 space-y-8">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Appearance
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Customize how Vaulteer looks on your device
                </p>
              </div>
              <Appearance />

              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Push Notifications
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Receive notifications for event updates, messages, and
                  important alerts
                </p>
              </div>
              <PushNotificationsToggle />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
