"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  IoShieldCheckmarkOutline,
  IoHomeOutline,
  IoArrowBackOutline,
  IoLockClosedOutline,
} from "react-icons/io5";

export default function ForbiddenPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 px-4">
      <div className="max-w-2xl w-full">
        {/* Main Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 md:p-12 text-center">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-red-600 opacity-20 rounded-full blur-xl"></div>
              <div className="relative bg-red-100 dark:bg-red-900/30 p-6 rounded-full">
                <IoLockClosedOutline className="w-20 h-20 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </div>

          {/* Error Code */}
          <div className="mb-4">
            <h1 className="text-8xl md:text-9xl font-extrabold text-red-600 dark:text-red-500 tracking-tight">
              403
            </h1>
          </div>

          {/* Title */}
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Access Forbidden
          </h2>

          {/* Description */}
          <div className="space-y-3 mb-8">
            <p className="text-lg text-gray-600 dark:text-gray-300">
              You don&apos;t have permission to access this resource.
            </p>
            <div className="flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400">
              <IoShieldCheckmarkOutline className="w-5 h-5" />
              <p className="text-sm">
                This area is protected and requires proper authentication.
              </p>
            </div>
          </div>

          {/* Possible Reasons */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6 mb-8 text-left">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3">
              Possible Reasons:
            </h3>
            <ul className="space-y-2 text-gray-600 dark:text-gray-400 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-0.5">•</span>
                <span>You are not logged in to the system</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-0.5">•</span>
                <span>
                  Your account does not have the required role or permissions
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-0.5">•</span>
                <span>Your session may have expired</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-0.5">•</span>
                <span>
                  You are trying to access a dashboard for a different role
                </span>
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => router.back()}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <IoArrowBackOutline className="w-5 h-5" />
              Go Back
            </button>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <IoHomeOutline className="w-5 h-5" />
              Return to Home
            </Link>
          </div>

          {/* Additional Help */}
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              If you believe this is an error, please contact your system
              administrator or try logging in again.
            </p>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Error Code: 403 • Forbidden • Access Denied
          </p>
        </div>
      </div>
    </div>
  );
}
