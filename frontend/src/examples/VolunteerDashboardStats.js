/**
 * Example: Real-time Stats for Volunteer Dashboard
 * Demonstrates how to integrate real-time updates for volunteer-specific metrics
 */

import React from "react";
import RealtimeStatsGrid from "../../components/ui/RealtimeStatsGrid";
import {
  IoCalendarOutline,
  IoTimeOutline,
  IoTrophyOutline,
  IoHeartOutline,
} from "react-icons/io5";

export default function VolunteerDashboardStats() {
  // Configuration for volunteer-specific stats
  const statsConfig = [
    {
      key: "hours_this_month",
      title: "Hours This Month",
      icon: IoTimeOutline,
      color: "blue",
      subtitle: "Volunteer time",
      trend: "up",
      trendValue: "+2h",
    },
    {
      key: "events_attended",
      title: "Events Attended",
      icon: IoCalendarOutline,
      color: "green",
      subtitle: "This year",
    },
    {
      key: "impact_score",
      title: "Impact Score",
      icon: IoTrophyOutline,
      color: "amber",
      subtitle: "Community contribution",
    },
    {
      key: "upcoming_events",
      title: "Upcoming Events",
      icon: IoHeartOutline,
      color: "red",
      subtitle: "Registered events",
    },
  ];

  // Fetch function for volunteer stats
  const fetchVolunteerStats = async () => {
    try {
      // Example API call - adjust to your backend endpoint
      const response = await fetch("/api/volunteer/stats", {
        headers: {
          "Content-Type": "application/json",
          // Add auth token if needed
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch stats");
      }

      const data = await response.json();

      // Return data in expected format
      return {
        hours_this_month: data.hoursThisMonth || 0,
        events_attended: data.eventsAttended || 0,
        impact_score: data.impactScore || 0,
        upcoming_events: data.upcomingEvents || 0,
      };
    } catch (error) {
      console.error("Error fetching volunteer stats:", error);
      return {
        hours_this_month: 0,
        events_attended: 0,
        impact_score: 0,
        upcoming_events: 0,
      };
    }
  };

  // Callback when stats update
  const handleStatsUpdate = (newData, changedFields) => {
    // Celebrate milestones
    if (changedFields.includes("events_attended")) {
      const milestones = [10, 25, 50, 100];
      if (milestones.includes(newData.events_attended)) {
        console.log(
          "🎉 Milestone reached:",
          newData.events_attended,
          "events!"
        );
        // Could show a congratulations modal
      }
    }

    // Alert for new upcoming events
    if (
      changedFields.includes("upcoming_events") &&
      newData.upcoming_events > 0
    ) {
      console.log("New event registered!");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
          My Journey
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Track your volunteer impact in real-time
        </p>
      </div>

      <RealtimeStatsGrid
        statsConfig={statsConfig}
        fetchCallback={fetchVolunteerStats}
        updateInterval={20000} // Update every 20 seconds
        channel="volunteer-journey"
        showLiveIndicator={true}
        gridCols={4}
        onStatsUpdate={handleStatsUpdate}
      />

      {/* Additional volunteer-specific content */}
      <div className="bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 rounded-xl p-6 border border-red-100 dark:border-red-800">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          💡 Tip: Maximize Your Impact
        </h3>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          Attend at least 2 events per month to maintain active volunteer status
          and unlock exclusive opportunities!
        </p>
      </div>
    </div>
  );
}
