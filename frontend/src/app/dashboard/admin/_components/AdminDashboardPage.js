"use client";

import DashboardRouteRenderer from "../../_components/DashboardRouteRenderer";
import AdminDashboard from "../../../../components/navigation/Dashboard/AdminDashboard";
import AdminActivityLog from "../../../../components/navigation/Log/AdminActivityLog";
import UserProfile from "../../../../components/navigation/Profile/UserProfile";
import FormSubmission from "../../../../components/navigation/Form/FormSubmission";
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
  "form-submission": {
    key: "form-submission",
    label: "Form Submission",
    parent: "hts-form",
    component: FormSubmission,
  },
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
