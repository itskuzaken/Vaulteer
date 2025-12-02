"use client";

import { useState, useEffect } from "react";
import { getAuth } from "firebase/auth";
import { useTheme } from "@/hooks/useTheme";
import {
  getUserSettings,
  updateUserSettings,
} from "../../../services/userSettingsService";
import {
  IoSunnyOutline,
  IoMoonOutline,
  IoPhonePortraitOutline,
} from "react-icons/io5";

export default function Appearance() {
  const { theme, setTheme: setLocalTheme, themes } = useTheme();
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasLoadedFromDb, setHasLoadedFromDb] = useState(false);

  // Listen to auth state changes
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
      if (!user) {
        setHasLoadedFromDb(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Load theme from database on mount
  useEffect(() => {
    const loadThemeFromDatabase = async () => {
      if (currentUser?.uid && !hasLoadedFromDb) {
        try {
          setIsLoading(true);
          const settings = await getUserSettings(currentUser.uid);
          if (settings.theme) {
            setLocalTheme(settings.theme);
          }
          setHasLoadedFromDb(true);
        } catch (err) {
          console.error("Error loading theme from database:", err);
          setHasLoadedFromDb(true);
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadThemeFromDatabase();
  }, [currentUser?.uid, hasLoadedFromDb, setLocalTheme]);

  const handleThemeChange = async (newTheme) => {
    // Update local theme immediately for responsive UI
    setLocalTheme(newTheme);

    // Sync with database if user is logged in
    if (currentUser?.uid) {
      try {
        setIsSyncing(true);
        const currentSettings = await getUserSettings(currentUser.uid);
        await updateUserSettings(currentUser.uid, {
          ...currentSettings,
          theme: newTheme,
        });
      } catch (err) {
        console.error("Error syncing theme to database:", err);
      } finally {
        setIsSyncing(false);
      }
    }
  };

  const themeOptions = [
    {
      value: themes.LIGHT,
      label: "Light",
      icon: IoSunnyOutline,
      description: "Light theme",
    },
    {
      value: themes.DARK,
      label: "Dark",
      icon: IoMoonOutline,
      description: "Dark theme",
    },
    {
      value: themes.SYSTEM,
      label: "System",
      icon: IoPhonePortraitOutline,
      description: "Follow system preference",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <label className="text-sm font-medium text-gray-900 dark:text-white">
          Theme
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {themeOptions.map((option) => {
            const Icon = option.icon;
            const isSelected = theme === option.value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleThemeChange(option.value)}
                disabled={isLoading || isSyncing}
                className={`
                  flex flex-col items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all
                  ${
                    isSelected
                      ? "border-[var(--primary-red)] bg-red-50 dark:bg-red-900/20"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                  }
                  ${(isLoading || isSyncing) ? "opacity-50 cursor-not-allowed" : ""}
                  focus:outline-none focus:ring-2 focus:ring-[var(--primary-red)] focus:ring-offset-2 dark:focus:ring-offset-gray-900
                `}
              >
                <Icon
                  className={`text-2xl ${
                    isSelected
                      ? "text-[var(--primary-red)]"
                      : "text-gray-600 dark:text-gray-400"
                  }`}
                />
                <span
                  className={`text-sm font-medium ${
                    isSelected
                      ? "text-[var(--primary-red)]"
                      : "text-gray-900 dark:text-white"
                  }`}
                >
                  {option.label}
                </span>
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  {option.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Preview indicator */}
      <div className="mt-4 p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Preview</p>
        <div className="flex items-center gap-2">
          <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-700" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-3/4" />
            <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded w-1/2" />
          </div>
        </div>
      </div>
    </div>
  );
}
