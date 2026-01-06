"use client";

import React from "react";
import Link from "next/link";
import { NotificationProvider } from "@/components/ui/NotificationProvider";

export default function NotFound() {
  return (
    <NotificationProvider>
      <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-gray-900">
        <div className="text-center px-4">
          <h1 className="text-9xl font-bold text-[var(--primary-red)] mb-4">
            404
          </h1>
          <h2 className="text-3xl font-semibold text-gray-900 dark:text-white mb-4">
            Page Not Found
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-[var(--primary-red)] text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
          >
            Go Back Home
          </Link>
        </div>
      </div>
    </NotificationProvider>
  );
}
