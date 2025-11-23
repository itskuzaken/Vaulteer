import { useState } from "react";
import { QuickActionCard } from "../../card/DashboardCard";
import RealtimeStatsGrid from "../../ui/RealtimeStatsGrid";
import DashboardSectionCard from "../../ui/DashboardSectionCard";
import {
  IoPeopleOutline,
  IoPersonOutline,
  IoDocumentTextOutline,
  IoChatbubbleEllipsesOutline,
  IoAddCircleOutline,
  IoStatsChartOutline,
  IoClose,
  IoFlashOutline,
} from "react-icons/io5";
import { getAuth } from "firebase/auth";
import { API_BASE } from "../../../config/config";
import DashboardEventsSidebar from "../../dashboard/DashboardEventsSidebar";
import LeaderboardCard from "../../gamification/LeaderboardCard";

export default function AdminDashboard({ onNavigate }) {
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
      key: "total_staff",
      title: "Staff Members",
      icon: IoPersonOutline,
      color: "green",
      subtitle: "Active staff",
    },
    {
      key: "total_applicants",
      title: "Pending Applications",
      icon: IoDocumentTextOutline,
      color: "amber",
      subtitle: "Awaiting approval",
    },
    {
      key: "recent_activity",
      title: "Recent Activity",
      icon: IoStatsChartOutline,
      color: "purple",
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

      console.log("Fetching stats with auth token...");

      const response = await fetch(`${API_BASE}/stats/dashboard`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Unknown error" }));
        console.error("Stats API error:", response.status, errorData);
        throw new Error(
          `Failed to fetch stats: ${errorData.error || response.statusText}`
        );
      }

      const result = await response.json();
      console.log("Stats fetched successfully:", result);
      return result.data;
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      throw error;
    }
  };

  // Handle stats update callback
  const handleStatsUpdate = (data, changedFields) => {
    if (changedFields.length > 0) {
      console.log("Stats updated:", changedFields);
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-6 animate-fadeIn">
        <div className="space-y-6">
          {/* Welcome Section */}
          {showWelcome && (
            <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-xl shadow-lg p-6 text-white relative">
              <button
                onClick={() => setShowWelcome(false)}
                className="absolute top-4 right-4 p-1 rounded-lg hover:bg-white/20 transition-colors"
                aria-label="Close welcome message"
              >
                <IoClose className="w-6 h-6" />
              </button>
              <h2 className="text-2xl font-bold mb-2">Welcome, Admin!</h2>
              <p className="text-red-100">
                Here&apos;s what&apos;s happening with your organization today.
              </p>
            </div>
          )}

          {/* Real-time Statistics Grid */}
          <RealtimeStatsGrid
            statsConfig={statsConfig}
            fetchCallback={fetchStats}
            updateInterval={15000}
            channel="admin-dashboard-stats"
            gridCols={4}
            onStatsUpdate={handleStatsUpdate}
          />

          <DashboardSectionCard
            title="Quick actions"
            subtitle="Keep work moving"
            icon={IoFlashOutline}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <QuickActionCard
                title="Create Post"
                description="Share updates with your team"
                icon={<IoChatbubbleEllipsesOutline />}
                color="blue"
                onClick={() => handleQuickAction("manage-post", "create-post")}
              />
              <QuickActionCard
                title="Create Event"
                description="Schedule a new event"
                icon={<IoAddCircleOutline />}
                color="green"
                onClick={() =>
                  handleQuickAction("manage-events", "create-event")
                }
              />
              <QuickActionCard
                title="Review Forms"
                description="Check submitted forms"
                icon={<IoDocumentTextOutline />}
                color="yellow"
                onClick={() => handleQuickAction("hts-form", "form-submission")}
              />
            </div>
          </DashboardSectionCard>
        </div>

        <div className="space-y-6">
          <DashboardEventsSidebar />
          <LeaderboardCard limit={6} />
        </div>
      </div>
    </>
  );
}
