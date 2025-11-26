"use client";

import { useState } from "react";
import Appearance from "./Appearance";
import PushNotificationsToggle from "./PushNotificationsToggle";

const SETTING_SECTIONS = [
  { id: "appearance", label: "Appearance", icon: "🎨" },
  { id: "notifications", label: "Notifications", icon: "🔔" },
];

export default function UserSettings() {
  const [activeSection, setActiveSection] = useState("appearance");

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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sidebar Navigation */}
          <aside className="lg:col-span-3">
            <nav className="space-y-1 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-2">
              {SETTING_SECTIONS.map((section) => {
                const isActive = activeSection === section.id;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg transition-colors ${
                      isActive
                        ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    }`}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <span className="text-xl" aria-hidden="true">
                      {section.icon}
                    </span>
                    <span>{section.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Main Content Area */}
          <main className="lg:col-span-9">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 space-y-8">
              {activeSection === "appearance" && <Appearance />}
              {activeSection === "notifications" && <PushNotificationsToggle />}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
