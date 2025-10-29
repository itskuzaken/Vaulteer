/**
 * Example: Complete Dashboard with Multiple Real-time Sections
 * Shows how to combine multiple real-time components in one dashboard
 */

import React, { useState } from "react";
import RealtimeStatsGrid from "../../components/ui/RealtimeStatsGrid";
import { useRealtimeStats } from "../../hooks/useRealtimeStats";
import {
  IoPersonOutline,
  IoDocumentTextOutline,
  IoCalendarOutline,
  IoTrendingUpOutline,
  IoWarningOutline,
} from "react-icons/io5";

export default function CompleteDashboardExample() {
  const [lastUpdate, setLastUpdate] = useState(null);

  // Stats configuration for overview section
  const overviewStats = [
    {
      key: "total_users",
      title: "Total Users",
      icon: IoPersonOutline,
      color: "blue",
    },
    {
      key: "active_volunteers",
      title: "Active Volunteers",
      icon: IoPersonOutline,
      color: "green",
    },
    {
      key: "pending_applications",
      title: "Pending Applications",
      icon: IoDocumentTextOutline,
      color: "amber",
    },
    {
      key: "upcoming_events",
      title: "Upcoming Events",
      icon: IoCalendarOutline,
      color: "purple",
    },
  ];

  // Fetch function for overview
  const fetchOverview = async () => {
    const response = await fetch("/api/dashboard/overview");
    const data = await response.json();
    return data;
  };

  // Fetch function for recent activity
  const fetchRecentActivity = async () => {
    const response = await fetch("/api/dashboard/activity");
    const data = await response.json();
    return {
      recent_logins: data.recentLogins || 0,
      new_registrations: data.newRegistrations || 0,
      documents_uploaded: data.documentsUploaded || 0,
    };
  };

  // Separate hook for recent activity stats
  const {
    data: activityData,
    loading: activityLoading,
    changedFields: activityChanges,
  } = useRealtimeStats(fetchRecentActivity, {
    channel: "recent-activity",
    interval: 10000, // Faster updates for activity
    onUpdate: (data, changed) => {
      setLastUpdate(new Date());
      console.log("Activity updated:", changed);
    },
  });

  // Global update handler
  const handleOverviewUpdate = (data, changed) => {
    setLastUpdate(new Date());

    // Alert on critical changes
    if (
      changed.includes("pending_applications") &&
      data.pending_applications > 50
    ) {
      console.warn("High number of pending applications!");
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Dashboard Overview
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Real-time system statistics and metrics
          </p>
        </div>

        {lastUpdate && (
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </div>
        )}
      </div>

      {/* Main Stats Grid */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          System Overview
        </h2>
        <RealtimeStatsGrid
          statsConfig={overviewStats}
          fetchCallback={fetchOverview}
          updateInterval={15000}
          channel="overview-stats"
          showLiveIndicator={true}
          gridCols={4}
          onStatsUpdate={handleOverviewUpdate}
        />
      </section>

      {/* Recent Activity Section */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Recent Activity (Last Hour)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <IoPersonOutline className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Recent Logins
                </div>
                <div
                  className={`text-2xl font-bold text-gray-900 dark:text-white ${
                    activityChanges.includes("recent_logins")
                      ? "animate-number-update"
                      : ""
                  }`}
                >
                  {activityLoading ? "..." : activityData?.recent_logins || 0}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <IoTrendingUpOutline className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  New Registrations
                </div>
                <div
                  className={`text-2xl font-bold text-gray-900 dark:text-white ${
                    activityChanges.includes("new_registrations")
                      ? "animate-number-update"
                      : ""
                  }`}
                >
                  {activityLoading
                    ? "..."
                    : activityData?.new_registrations || 0}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <IoDocumentTextOutline className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Documents Uploaded
                </div>
                <div
                  className={`text-2xl font-bold text-gray-900 dark:text-white ${
                    activityChanges.includes("documents_uploaded")
                      ? "animate-number-update"
                      : ""
                  }`}
                >
                  {activityLoading
                    ? "..."
                    : activityData?.documents_uploaded || 0}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Alert Section (Example) */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          System Alerts
        </h2>
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <IoWarningOutline className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div>
              <h3 className="font-medium text-amber-900 dark:text-amber-300">
                Real-time Monitoring Active
              </h3>
              <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                All dashboard statistics are updating automatically every 15
                seconds. Changes will be highlighted with animations.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
