"use client";

import { useState, useEffect } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import ModernDashboardLayout from "../../../components/layout/ModernDashboardLayout";
import ModernSidebar from "../../../components/sidebar/ModernSidebar";
import LogoutModal from "../../../components/modals/LogoutModal";
import RoleProtectedRoute from "../../../components/auth/RoleProtectedRoute";
import { API_BASE } from "../../../config/config";

import FormSubmission from "../../../components/navigation/Form/FormSubmission";
import CreatePost from "../../../components/navigation/Post/CreatePost";
import PublishedPosts from "../../../components/navigation/Post/PublishedPosts";
import ArchivedPosts from "../../../components/navigation/Post/ArchivedPosts";
import ScheduledPosts from "../../../components/navigation/Post/ScheduledPosts";
import CreateAnnouncement from "../../../components/navigation/Post/CreateAnnouncement";
import ViewAllVolunteers from "../../../components/navigation/Volunteer/ViewAllVolunteers";
import ApplicationApproval from "../../../components/navigation/Volunteer/ApplicationApproval";
import ViewAllStaff from "../../../components/navigation/Staff/ViewAllStaff";
import CreateEvent from "../../../components/navigation/Event/CreateEvent";
import PublishedEvents from "../../../components/navigation/Event/PublishedEvents";
import ArchivedEvents from "../../../components/navigation/Event/ArchivedEvents";
import GeneralSettings from "../../../components/navigation/Settings/GeneralSettings";
import Appearance from "../../../components/navigation/Settings/Appearance";
import UserAccountSettings from "../../../components/navigation/Settings/UserAccountSettings";
import AdminDashboard from "../../../components/navigation/Dashboard/AdminDashboard";
import AdminActivityLog from "../../../components/navigation/Log/AdminActivityLog";
import UserProfile from "../../../components/navigation/Profile/UserProfile";

// Map sub-section names to components (Overview is NOT included here)
const subContentComponentMap = {
  "Form Submission": FormSubmission,
  "Create Post": CreatePost,
  "Published Posts": PublishedPosts,
  "Archived Posts": ArchivedPosts,
  "Scheduled Posts": ScheduledPosts,
  "Create Announcement": CreateAnnouncement,
  "View All Volunteers": ViewAllVolunteers,
  "Application Approval": ApplicationApproval,
  "View All Staff": ViewAllStaff,
  "Create Event": CreateEvent,
  "Published Events": PublishedEvents,
  "Archived Events": ArchivedEvents,
  "General Settings": GeneralSettings,
  Appearance: Appearance,
  "User & Account Settings": UserAccountSettings,
};

// Map main content sections to components
const mainContentComponentMap = {
  "Activity Logs": AdminActivityLog,
  Profile: UserProfile,
};

function AdminDashboardPage() {
  const [user, setUser] = useState(null);
  const [selectedContent, setSelectedContent] = useState("Dashboard");
  const [selectedSubContent, setSelectedSubContent] = useState(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleContentChange = (content) => {
    setSelectedContent(content);
    if (content === "Dashboard") {
      setSelectedSubContent(null);
    }
  };

  const handleSubContentChange = (subContent) => {
    setSelectedSubContent(subContent);
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const handleSettingsClick = () => {
    setSelectedContent("Settings");
    setSelectedSubContent("General Settings");
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
      <AdminDashboard onNavigate={handleOverviewNavigation} />
    );
  } else if (mainContentComponentMap[selectedContent]) {
    // Check main content sections first (like Activity Logs)
    ActiveComponent = mainContentComponentMap[selectedContent];
  } else if (selectedSubContent && subContentComponentMap[selectedSubContent]) {
    ActiveComponent = subContentComponentMap[selectedSubContent];
  } else if (selectedContent && subContentComponentMap[selectedContent]) {
    ActiveComponent = subContentComponentMap[selectedContent];
  } else {
    ActiveComponent = () => (
      <AdminDashboard onNavigate={handleOverviewNavigation} />
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
      <div
        className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900"
        suppressHydrationWarning
      >
        <div className="text-center" suppressHydrationWarning>
          <div
            className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"
            suppressHydrationWarning
          ></div>
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
    <RoleProtectedRoute requiredRole="admin">
      <ModernDashboardLayout
        role="admin"
        user={user}
        pageTitle={getPageTitle()}
        onLogout={handleLogout}
        onSettingsClick={handleSettingsClick}
        onProfileClick={handleProfileClick}
        sidebar={
          <ModernSidebar
            role="admin"
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

export default AdminDashboardPage;
