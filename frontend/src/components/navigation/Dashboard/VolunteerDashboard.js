import { useState, useEffect } from "react";
import { QuickActionCard } from "../../card/DashboardCard";
import RealtimeStatsGrid from "../../ui/RealtimeStatsGrid";
import {
  IoDocumentTextOutline,
  IoEyeOutline,
  IoStatsChartOutline,
  IoTodayOutline,
  IoClose,
} from "react-icons/io5";
import { getAuth } from "firebase/auth";
import { API_BASE } from "../../../config/config";

export default function VolunteerDashboard({ onNavigate }) {
  const [showWelcome, setShowWelcome] = useState(true);
  const [userRole, setUserRole] = useState(null);

  // Check user role on mount
  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (user) {
      user.getIdToken().then(async (token) => {
        try {
          const response = await fetch(`${API_BASE}/me`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          if (response.ok) {
            const data = await response.json();
            setUserRole(data.role);
          }
        } catch (error) {
          console.error("Error fetching user role:", error);
        }
      });
    }
  }, []);

  const handleQuickAction = (contentKey, subContentKey = null) => {
    if (onNavigate) {
      onNavigate(contentKey, subContentKey);
    }
  };

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
    <div className="space-y-6 animate-fadeIn">
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
            Thank you for your dedication. Here's your activity overview.
          </p>
        </div>
      )}

      {/* Real-time Statistics Grid - Only show for volunteers */}
      {userRole === "volunteer" && (
        <RealtimeStatsGrid
          statsConfig={statsConfig}
          fetchCallback={fetchStats}
          updateInterval={15000}
          channel="volunteer-dashboard-stats"
          showLiveIndicator={true}
          gridCols={2}
        />
      )}

      {/* Show message for non-volunteers */}
      {userRole && userRole !== "volunteer" && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 text-center">
          <p className="text-blue-600 dark:text-blue-400">
            This dashboard is for volunteers only. Your role: {userRole}
          </p>
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <QuickActionCard
            title="Submit Form"
            description="Submit a new HTS form"
            icon={<IoDocumentTextOutline />}
            color="yellow"
            onClick={() => handleQuickAction("forms", "submit-form")}
          />
          <QuickActionCard
            title="View Submissions"
            description="Check your submitted forms"
            icon={<IoEyeOutline />}
            color="blue"
            onClick={() => handleQuickAction("forms", "view-submitted")}
          />
        </div>
      </div>
    </div>
  );
}
