"use client";

import DashboardRouteRenderer from "../../_components/DashboardRouteRenderer";
import StaffDashboard from "../../../../components/navigation/Dashboard/StaffDashboard";
import StaffActivityLog from "../../../../components/navigation/Log/StaffActivityLog";
import UserProfile from "../../../../components/navigation/Profile/UserProfile";
import HTSFormManagement from "../../../../components/navigation/Form/HTSFormManagement";
import NewsUpdates from "@/components/navigation/Post/NewsUpdates";
import Announcements from "@/components/navigation/Post/Announcements";
import ManageVolunteer from "../../../../components/navigation/Volunteer/ManageVolunteer";
import ManageApplications from "../../../../components/navigation/Application/ManageApplications";
import ManageEvents from "../../../../components/navigation/Event/ManageEvents";
import EventDetailsContent from "../../../../components/navigation/Event/EventDetailsContent";
import CreateEvent from "../../../../components/navigation/Event/CreateEvent";
import PostDetailsContent from "../../../../components/navigation/Post/PostDetailsContent";
import UserSettings from "../../../../components/navigation/Settings/UserSettings";
import NotificationsPage from "../../../../components/notifications/NotificationsPage";

const staffMainRoutes = {
  dashboard: {
    label: "Dashboard",
    component: StaffDashboard,
    withNavigate: true,
  },
  "my-activity": {
    label: "My Activity",
    component: StaffActivityLog,
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
    component: StaffViewAllVolunteers,
    withNavigate: true,
  },
  "manage-applications": {
    label: "Manage Applications",
    component: StaffApplicationApproval,
    withNavigate: true,
  },
  "hts-forms": {
    label: "HTS Forms",
    component: HTSFormManagement,
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

function StaffViewAllVolunteers(props) {
  return (
    <ManageVolunteer profileBasePath="/dashboard/staff/profile" {...props} />
  );
}

function StaffApplicationApproval(props) {
  return (
    <ManageApplications profileBasePath="/dashboard/staff/profile" {...props} />
  );
}

const staffSubRoutes = {
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
  // 'user-settings' sub-route removed - settings are a single combined page
};

export default function StaffDashboardPage({
  contentSlug,
  subContentSlug,
  routingStrategy = "path",
}) {
  return (
    <DashboardRouteRenderer
      role="staff"
      basePath="/dashboard/staff"
      contentSlug={contentSlug}
      subContentSlug={subContentSlug}
      defaultContent="dashboard"
      mainRoutes={staffMainRoutes}
      subRoutes={staffSubRoutes}
      routingStrategy={routingStrategy}
    />
  );
}
