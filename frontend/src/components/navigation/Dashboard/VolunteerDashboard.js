import { useState, useCallback } from "react";
import { QuickActionCard } from "../../card/DashboardCard";
import RealtimeStatsGrid from "../../ui/RealtimeStatsGrid";
import DashboardSectionCard from "../../ui/DashboardSectionCard";
import QuickActionsSection from "../../ui/QuickActionsSection";
import {
  IoDocumentTextOutline,
  IoEyeOutline,
  IoStatsChartOutline,
  IoTodayOutline,
  IoClose,
  IoCalendarOutline,
  IoFlashOutline,
} from "react-icons/io5";
import { getAuth } from "firebase/auth";
import { API_BASE } from "../../../config/config";
import DashboardEventsSidebar from "../../dashboard/DashboardEventsSidebar";
import MyImpactWidget from "../../gamification/MyImpactWidget";
import BadgeCarousel from "../../gamification/BadgeCarousel";
import LeaderboardCard from "../../gamification/LeaderboardCard";
import NewsUpdatesCarousel from "../../dashboard/NewsUpdatesCarousel";
import AnnouncementsSidebarPanel from "../../dashboard/AnnouncementsSidebarPanel";

export default function VolunteerDashboard({
  onNavigate,
  currentUser,
  gamificationSummary,
}) {
  const [showWelcome, setShowWelcome] = useState(true);
  const userRole = (currentUser?.role || "").toLowerCase();

  const handleQuickAction = useCallback(
    (contentKey, subContentKey = null) => {
      if (onNavigate) {
        onNavigate(contentKey, subContentKey);
      }
    },
    [onNavigate]
  );

  // Stats configuration for real-time grid
  const statsConfig = [
    {
      key: "my_activity_week",
      title: "This Week",
      icon: IoStatsChartOutline,
      color: "blue",
      subtitle: "Activity count",
    },
    {
      key: "my_activity_today",
      title: "Today",
      icon: IoTodayOutline,
      color: "green",
      subtitle: "Today's activity",
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

      console.log("Fetching volunteer stats with auth token...");

      const response = await fetch(`${API_BASE}/stats/volunteer`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Unknown error" }));
        console.error("Volunteer Stats API error:", response.status, errorData);
        throw new Error(
          `Failed to fetch stats: ${errorData.error || response.statusText}`
        );
      }

      const result = await response.json();
      console.log("Volunteer stats fetched successfully:", result);
      return result.data;
    } catch (error) {
      console.error("Error fetching volunteer stats:", error);
      throw error;
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-6 animate-fadeIn">
      <div className="space-y-6">
        {/* Welcome Section */}
        {showWelcome && (
          <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-xl shadow-lg p-6 text-white relative">
            <button
              onClick={() => setShowWelcome(false)}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-white/20 transition-colors"
              aria-label="Close welcome message"
            >
              <IoClose className="w-6 h-6" />
            </button>
            <h2 className="text-2xl font-bold mb-2">
              Welcome back, Volunteer! 👋
            </h2>
            <p className="text-yellow-100">
              Thank you for your dedication. Here&apos;s your activity overview.
            </p>
          </div>
        )}

        <MyImpactWidget summary={gamificationSummary} />

        <BadgeCarousel
          badges={gamificationSummary?.badges}
          loading={!gamificationSummary}
        />

        {/* News & Updates Carousel */}
        <NewsUpdatesCarousel />

        {/* Show message for non-volunteers */}
        {userRole && userRole !== "volunteer" && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 text-center">
            <p className="text-blue-600 dark:text-blue-400">
              This dashboard is for volunteers only. Your role: {userRole}
            </p>
          </div>
        )}

        <QuickActionsSection
          title="Quick actions"
          subtitle="Stay productive"
          icon={IoFlashOutline}
        >
          <QuickActionCard
            title="Submit Form"
            description="Submit a new HTS form"
            icon={<IoDocumentTextOutline />}
            color="yellow"
            onClick={() => handleQuickAction("hts-forms")}
          />
          <QuickActionCard
            title="View Submissions"
            description="Check your submitted forms"
            icon={<IoEyeOutline />}
            color="blue"
            onClick={() => handleQuickAction("hts-forms")}
          />
          <QuickActionCard
            title="My Events"
            description="See registered and past events"
            icon={<IoCalendarOutline />}
            color="red"
            onClick={() => handleQuickAction("my-events")}
          />
        </QuickActionsSection>
      </div>

      <div className="space-y-6">
        <DashboardEventsSidebar />
        <AnnouncementsSidebarPanel />
        <LeaderboardCard limit={6} />
      </div>
    </div>
  );
}
