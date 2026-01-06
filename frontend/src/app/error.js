"use client";

import React, { useEffect } from "react";
import { NotificationProvider } from "@/components/ui/NotificationProvider";

export default function Error({ error, reset }) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Error boundary caught:", error);
  }, [error]);

  return (
    <NotificationProvider>
      <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-gray-900">
        <div className="text-center px-4 max-w-md">
          <h1 className="text-6xl font-bold text-[var(--primary-red)] mb-4">
            Oops!
          </h1>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            Something went wrong
          </h2>
          <p className="text-base text-gray-600 dark:text-gray-400 mb-8">
            We&apos;re sorry, but something unexpected happened. Please try again.
          </p>
          <button
            onClick={() => reset()}
            className="inline-block px-6 py-3 bg-[var(--primary-red)] text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    </NotificationProvider>
  );
}
