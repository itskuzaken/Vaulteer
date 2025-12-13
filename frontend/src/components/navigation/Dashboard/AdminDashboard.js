import { useState } from "react";
import { QuickActionCard } from "../../card/DashboardCard";
import RealtimeStatsGrid from "../../ui/RealtimeStatsGrid";
import QuickActionsSection from "../../ui/QuickActionsSection";
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
import statsService from "../../../services/statsService";
import DashboardEventsSidebar from "../../dashboard/DashboardEventsSidebar";
import LeaderboardCard from "../../gamification/LeaderboardCard";
import NewsUpdatesCarousel from "../../dashboard/NewsUpdatesCarousel";
import AnnouncementsSidebarPanel from "../../dashboard/AnnouncementsSidebarPanel";

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
      onClick: () => handleQuickAction("manage-users", "volunteers"),
    },
    {
      key: "total_staff",
      title: "Staff Members",
      icon: IoPersonOutline,
      color: "green",
      subtitle: "Active staff",
      onClick: () => handleQuickAction("manage-users", "staff"),
    },
    {
      key: "total_applicants",
      title: "Pending Applications",
      icon: IoDocumentTextOutline,
      color: "amber",
      subtitle: "Awaiting approval",
      onClick: () => handleQuickAction("manage-users", "applicants"),
    },
    {
      key: "recent_activity",
      title: "Recent Activity",
      icon: IoStatsChartOutline,
      color: "purple",
      subtitle: "Last 24 hours",
    },
    {
      key: "participations_today",
      title: "Participations Today",
      icon: IoDocumentTextOutline,
      color: "rose",
      subtitle: "HTS Forms submitted",
      kpiType: "donut",
      breakdownKey: "participations_today_by_result",
      trendKey: "participations_trend_last7",
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
      // Fetch participation stats
      let participation = {};
      try {
        const pResp = await statsService.getParticipationStats();
        participation = pResp?.data || {};
      } catch (err) {
        console.warn("Failed to fetch participation stats:", err);
      }

      const merged = {
        ...result.data,
        participations_today: participation.today || 0,
        participations_last7: participation.last7 || 0,
        participations_last30: participation.last30 || 0,
        participations_today_by_result: participation.today_by_result || {},
        participations_trend_last7: participation.trend_last7 || [],
      };

      console.log("Stats fetched successfully:", merged);
      return merged;
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

          {/* News & Updates Carousel */}
          <NewsUpdatesCarousel />

          <QuickActionsSection
            title="Quick actions"
            subtitle="Keep work moving"
            icon={IoFlashOutline}
          >
            <QuickActionCard
              title="Create Post"
              description="Share updates with your team"
              icon={<IoChatbubbleEllipsesOutline />}
              color="blue"
              onClick={() => handleQuickAction("manage-post", "news-updates")}
            />
            <QuickActionCard
              title="Create Event"
              description="Schedule a new event"
              icon={<IoAddCircleOutline />}
              color="green"
              onClick={() => handleQuickAction("manage-events", "create-event")}
            />
            <QuickActionCard
              title="Review Forms"
              description="Check submitted forms"
              icon={<IoDocumentTextOutline />}
              color="yellow"
              onClick={() => handleQuickAction("hts-forms")}
            />
          </QuickActionsSection>
        </div>

        <div className="space-y-6">
          <DashboardEventsSidebar />
          <AnnouncementsSidebarPanel />
          <LeaderboardCard limit={6} />
        </div>
      </div>
    </>
  );
}
