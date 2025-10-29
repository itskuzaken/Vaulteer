/**
 * Example: Real-time Stats for Staff Dashboard
 * Demonstrates how to integrate real-time updates for staff-specific metrics
 */

import React from "react";
import RealtimeStatsGrid from "../../components/ui/RealtimeStatsGrid";
import {
  IoPersonOutline,
  IoDocumentTextOutline,
  IoCheckmarkCircleOutline,
  IoTimeOutline,
} from "react-icons/io5";

export default function StaffDashboardStats() {
  // Configuration for staff-specific stats
  const statsConfig = [
    {
      key: "my_tasks",
      title: "My Tasks",
      icon: IoDocumentTextOutline,
      color: "blue",
      subtitle: "Assigned to me",
    },
    {
      key: "completed_today",
      title: "Completed Today",
      icon: IoCheckmarkCircleOutline,
      color: "green",
      subtitle: "Tasks finished",
    },
    {
      key: "pending_approvals",
      title: "Pending Approvals",
      icon: IoTimeOutline,
      color: "amber",
      subtitle: "Waiting for review",
    },
    {
      key: "volunteers_managed",
      title: "Volunteers Managed",
      icon: IoPersonOutline,
      color: "purple",
      subtitle: "Under my supervision",
    },
  ];

  // Fetch function for staff stats
  const fetchStaffStats = async () => {
    try {
      // Example API call - adjust to your backend endpoint
      const response = await fetch("/api/staff/stats", {
        headers: {
          "Content-Type": "application/json",
          // Add auth token if needed
          // 'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch stats");
      }

      const data = await response.json();

      // Return data in expected format
      return {
        my_tasks: data.myTasks || 0,
        completed_today: data.completedToday || 0,
        pending_approvals: data.pendingApprovals || 0,
        volunteers_managed: data.volunteersManaged || 0,
      };
    } catch (error) {
      console.error("Error fetching staff stats:", error);
      // Return default values on error
      return {
        my_tasks: 0,
        completed_today: 0,
        pending_approvals: 0,
        volunteers_managed: 0,
      };
    }
  };

  // Callback when stats update
  const handleStatsUpdate = (newData, changedFields) => {
    if (
      changedFields.includes("pending_approvals") &&
      newData.pending_approvals > 0
    ) {
      // Could trigger a notification or update badge
      console.log("New approvals pending:", newData.pending_approvals);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
          My Performance
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Real-time overview of your tasks and activities
        </p>
      </div>

      <RealtimeStatsGrid
        statsConfig={statsConfig}
        fetchCallback={fetchStaffStats}
        updateInterval={15000} // Update every 15 seconds
        channel="staff-performance"
        showLiveIndicator={true}
        gridCols={4}
        onStatsUpdate={handleStatsUpdate}
      />
    </div>
  );
}
