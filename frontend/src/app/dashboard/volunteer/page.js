"use client";

import { useState, useEffect } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import ModernDashboardLayout from "../../../components/layout/ModernDashboardLayout";
import ModernSidebar from "../../../components/sidebar/ModernSidebar";
import LogoutModal from "../../../components/modals/LogoutModal";
import RoleProtectedRoute from "../../../components/auth/RoleProtectedRoute";
import { API_BASE } from "../../../config/config";
import SubmitForm from "../../../components/navigation/Form/SubmitForm";
import ViewSubmitted from "../../../components/navigation/Form/ViewSubmitted";
import VolunteerDashboard from "../../../components/navigation/Dashboard/VolunteerDashboard";
import VolunteerActivityLog from "../../../components/navigation/Log/VolunteerActivityLog";
import UserProfile from "../../../components/navigation/Profile/UserProfile";

// Map sub-section names to components
const subContentComponentMap = {
  "Submit Form": SubmitForm,
  "View Submitted": ViewSubmitted,
};

// Map main content names to components
const mainContentComponentMap = {
  "My Activity": VolunteerActivityLog,
  Profile: UserProfile,
};

function VolunteerDashboardPage() {
  const [user, setUser] = useState(null);
  const [selectedContent, setSelectedContent] = useState("Dashboard");
  const [selectedSubContent, setSelectedSubContent] = useState(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleContentChange = (content) => {
    setSelectedContent(content);
    setSelectedSubContent(null);
  };

  const handleSubContentChange = (subContent) => {
    setSelectedSubContent(subContent);
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const handleSettingsClick = () => {
    // Volunteers don't have extensive settings, could redirect to profile
    // For now, we'll keep it simple - you can customize this later
    alert("Settings feature coming soon!");
  };

  const handleProfileClick = () => {
    setSelectedContent("Profile");
    setSelectedSubContent(null);
  };

  // Navigation handler for overview quick actions
  const handleOverviewNavigation = (content, subContent) => {
    setSelectedContent(content);
    setSelectedSubContent(subContent);
  };

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      try {
        if (currentUser) {
          // Fetch complete user data from backend
          try {
            const token = await currentUser.getIdToken();
            const response = await fetch(`${API_BASE}/me`, {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            });

            if (response.ok) {
              const userData = await response.json();
              setUser({
                user_id: userData.user_id,
                displayName:
                  currentUser.displayName || userData.name || "Unknown User",
                photoURL: currentUser.photoURL || null,
                email: userData.email,
                role: userData.role,
                status: userData.status,
              });
            } else {
              // Fallback to Firebase data only
              console.warn("Backend fetch failed, using Firebase data only");
              setUser({
                displayName: currentUser.displayName || "Unknown User",
                photoURL: currentUser.photoURL || null,
              });
            }
          } catch (fetchError) {
            // Network error or backend not available - use Firebase data
            console.warn(
              "Error fetching backend data, using Firebase data:",
              fetchError.message
            );
            setUser({
              displayName: currentUser.displayName || "Unknown User",
              photoURL: currentUser.photoURL || null,
            });
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Error handling auth state change:", error);
        setUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Determine which component to render
  let ActiveComponent;
  if (selectedContent === "Dashboard") {
    ActiveComponent = () => (
      <VolunteerDashboard onNavigate={handleOverviewNavigation} />
    );
  } else if (mainContentComponentMap[selectedContent]) {
    ActiveComponent = mainContentComponentMap[selectedContent];
  } else if (selectedSubContent && subContentComponentMap[selectedSubContent]) {
    ActiveComponent = subContentComponentMap[selectedSubContent];
  } else if (selectedContent && subContentComponentMap[selectedContent]) {
    ActiveComponent = subContentComponentMap[selectedContent];
  } else {
    ActiveComponent = () => (
      <VolunteerDashboard onNavigate={handleOverviewNavigation} />
    );
  }

  // Get page title based on current selection
  const getPageTitle = () => {
    if (selectedSubContent) return selectedSubContent;
    if (selectedContent) return selectedContent;
    return "Dashboard Overview";
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Loading...
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Please wait while we load your dashboard.
          </p>
        </div>
      </div>
    );
  }

  return (
    <RoleProtectedRoute requiredRole="volunteer">
      <ModernDashboardLayout
        role="volunteer"
        user={user}
        pageTitle={getPageTitle()}
        onLogout={handleLogout}
        onSettingsClick={handleSettingsClick}
        onProfileClick={handleProfileClick}
        sidebar={
          <ModernSidebar
            role="volunteer"
            selectedContent={selectedContent}
            selectedSubContent={selectedSubContent}
            onContentChange={handleContentChange}
            onSubContentChange={handleSubContentChange}
          />
        }
      >
        <ActiveComponent />
      </ModernDashboardLayout>

      {showLogoutModal && (
        <LogoutModal
          onCancel={() => setShowLogoutModal(false)}
          onConfirm={() => {
            setShowLogoutModal(false);
            // Add your logout logic here
          }}
        />
      )}
    </RoleProtectedRoute>
  );
}

export default VolunteerDashboardPage;
