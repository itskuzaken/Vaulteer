import { useState } from "react";
import { QuickActionCard } from "../../card/DashboardCard";
import RealtimeStatsGrid from "../../ui/RealtimeStatsGrid";
import {
  IoPeopleOutline,
  IoChatbubbleEllipsesOutline,
  IoCalendarOutline,
  IoStatsChartOutline,
  IoClose,
} from "react-icons/io5";
import { getAuth } from "firebase/auth";
import { API_BASE } from "../../../config/config";

export default function StaffDashboard({ onNavigate }) {
  const [showWelcome, setShowWelcome] = useState(true);

  const handleQuickAction = (contentKey, subContentKey = null) => {
    if (onNavigate) {
      onNavigate(contentKey, subContentKey);
    }
  };

  // Stats configuration for real-time grid
  const statsConfig = [
    {
      key: "total_volunteers",
      title: "Total Volunteers",
      icon: IoPeopleOutline,
      color: "blue",
      subtitle: "Active members",
    },
    {
      key: "my_tasks",
      title: "My Tasks",
      icon: IoCalendarOutline,
      color: "green",
      subtitle: "Last 7 days",
    },
    {
      key: "my_activity_today",
      title: "Today's Activity",
      icon: IoStatsChartOutline,
      color: "amber",
      subtitle: "Last 24 hours",
    },
  ];

  // Fetch stats from API
  const fetchStats = async () => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) {
        console.warn("User not authenticated - waiting for auth...");
        throw new Error("User not authenticated");
      }

      const token = await user.getIdToken();

      if (!token) {
        console.warn("No Firebase token available");
        throw new Error("No authentication token");
      }

      console.log("Fetching staff stats with auth token...");

      const response = await fetch(`${API_BASE}/stats/staff`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Unknown error" }));
        console.error("Staff Stats API error:", response.status, errorData);
        throw new Error(
          `Failed to fetch stats: ${errorData.error || response.statusText}`
        );
      }

      const result = await response.json();
      console.log("Staff stats fetched successfully:", result);
      return result.data;
    } catch (error) {
      console.error("Error fetching staff stats:", error);
      throw error;
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Welcome Section */}
      {showWelcome && (
        <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-xl shadow-lg p-6 text-white relative">
          <button
            onClick={() => setShowWelcome(false)}
            className="absolute top-4 right-4 p-1 rounded-lg hover:bg-white/20 transition-colors"
            aria-label="Close welcome message"
          >
            <IoClose className="w-6 h-6" />
          </button>
          <h2 className="text-2xl font-bold mb-2">
            Welcome back, Staff Member! 👋
          </h2>
          <p className="text-green-100">
            Here's an overview of your activities and pending tasks.
          </p>
        </div>
      )}

      {/* Real-time Statistics Grid */}
      <RealtimeStatsGrid
        statsConfig={statsConfig}
        fetchCallback={fetchStats}
        updateInterval={15000}
        channel="staff-dashboard-stats"
        showLiveIndicator={true}
        gridCols={3}
      />

      {/* Quick Actions */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <QuickActionCard
            title="Review Applications"
            description="Check pending volunteer applications"
            icon={<IoPeopleOutline />}
            color="green"
            onClick={() =>
              handleQuickAction("manage-volunteer", "application-approval")
            }
          />
          <QuickActionCard
            title="Create Post"
            description="Share updates with volunteers"
            icon={<IoChatbubbleEllipsesOutline />}
            color="blue"
            onClick={() => handleQuickAction("manage-post", "create-post")}
          />
          <QuickActionCard
            title="Create Event"
            description="Schedule a new event"
            icon={<IoCalendarOutline />}
            color="yellow"
            onClick={() => handleQuickAction("manage-events", "create-event")}
          />
        </div>
      </div>
    </div>
  );
}
