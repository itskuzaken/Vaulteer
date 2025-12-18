"use client";

import DashboardRouteRenderer from "../../_components/DashboardRouteRenderer";
import AdminDashboard from "../../../../components/navigation/Dashboard/AdminDashboard";
import AdminActivityLog from "../../../../components/navigation/Log/AdminActivityLog";
import UserProfile from "../../../../components/navigation/Profile/UserProfile";
import AdminFormReview from "../../../../components/navigation/Form/AdminFormReview";
import NewsUpdates from "@/components/navigation/Post/NewsUpdates";
import Announcements from "@/components/navigation/Post/Announcements";
import ManageVolunteer from "../../../../components/navigation/Volunteer/ManageVolunteer";
import ManageApplications from "../../../../components/navigation/Application/ManageApplications";
import ManageStaff from "../../../../components/navigation/Staff/ManageStaff";
import ManageEvents from "../../../../components/navigation/Event/ManageEvents";
import EventDetailsContent from "../../../../components/navigation/Event/EventDetailsContent";
import CreateEvent from "../../../../components/navigation/Event/CreateEvent";
import PostDetailsContent from "../../../../components/navigation/Post/PostDetailsContent";
import UserSettings from "../../../../components/navigation/Settings/UserSettings";
import NotificationsPage from "../../../../components/notifications/NotificationsPage";

// System Settings Pages
import GamificationSettings from "../../../../components/admin/settings/GamificationSettings";
import EventsSettings from "../../../../components/admin/settings/EventsSettings";
import NotificationsSettings from "../../../../components/admin/settings/NotificationsSettings";
import SystemSettings from "../../../../components/admin/settings/SystemSettings";
import OcrSettings from "../../../../components/admin/settings/OcrSettings";

const adminMainRoutes = {
  dashboard: {
    label: "Dashboard",
    component: AdminDashboard,
    withNavigate: true,
  },
  "activity-logs": {
    label: "Activity Logs",
    component: AdminActivityLog,
  },
  profile: {
    label: "Profile",
    component: UserProfile,
  },
  settings: {
    label: "Settings",
    component: UserSettings,
  },
  notifications: {
    label: "Notifications",
    component: NotificationsPage,
  },
  "manage-events": {
    label: "Manage Events",
    component: ManageEvents,
    withNavigate: true,
  },
  "manage-volunteer": {
    label: "Manage Volunteer",
    component: AdminViewAllVolunteers,
    withNavigate: true,
  },
  "manage-staff": {
    label: "Manage Staff",
    component: AdminViewAllStaff,
    withNavigate: true,
  },
  "manage-applications": {
    label: "Manage Applications",
    component: AdminApplicationApproval,
    withNavigate: true,
  },
  "hts-forms": {
    label: "HTS Forms",
    component: AdminFormReview,
  },
  event: {
    label: "Event Details",
    component: EventDetailsContent,
    withNavigate: true,
    sidebarKey: "manage-events",
  },
  post: {
    label: "Post Details",
    component: PostDetailsContent,
    withNavigate: true,
    sidebarKey: "manage-post",
  },
};

function AdminViewAllVolunteers(props) {
  return (
    <ManageVolunteer profileBasePath="/dashboard/admin/profile" {...props} />
  );
}

function AdminViewAllStaff(props) {
  return <ManageStaff profileBasePath="/dashboard/admin/profile" {...props} />;
}

function AdminApplicationApproval(props) {
  return (
    <ManageApplications profileBasePath="/dashboard/admin/profile" {...props} />
  );
}

const adminSubRoutes = {
  "news-updates": {
    key: "news-updates",
    label: "News & Updates",
    parent: "manage-post",
    component: NewsUpdates,
  },
  "announcements": {
    key: "announcements",
    label: "Announcements",
    parent: "manage-post",
    component: Announcements,
  },
  "create-event": {
    key: "create-event",
    label: "Create Event",
    parent: "manage-events",
    component: CreateEvent,
    withNavigate: true,
  },
  // System Settings sub-routes
  "gamification": {
    key: "gamification",
    label: "Gamification Settings",
    parent: "system-settings",
    component: GamificationSettings,
  },
  "events": {
    key: "events",
    label: "Events Settings",
    parent: "system-settings",
    component: EventsSettings,
  },
  "notifications": {
    key: "notifications",
    label: "Notifications Settings",
    parent: "system-settings",
    component: NotificationsSettings,
  },
  "system": {
    key: "system",
    label: "System Settings",
    parent: "system-settings",
    component: SystemSettings,
  },
  "ocr": {
    key: "ocr",
    label: "OCR Settings",
    parent: "system-settings",
    component: OcrSettings,
  },
  // Settings are a single combined page (UserSettings); individual setting
  // sub-routes like 'appearance' and 'user-account-settings' have been
  // consolidated into the top-level settings page.
};

export default function AdminDashboardPage({
  contentSlug,
  subContentSlug,
  routingStrategy = "path",
}) {
  return (
    <DashboardRouteRenderer
      role="admin"
      basePath="/dashboard/admin"
      contentSlug={contentSlug}
      subContentSlug={subContentSlug}
      defaultContent="dashboard"
      mainRoutes={adminMainRoutes}
      subRoutes={adminSubRoutes}
      routingStrategy={routingStrategy}
    />
  );
}
