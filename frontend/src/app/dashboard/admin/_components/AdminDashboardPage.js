"use client";

import DashboardRouteRenderer from "../../_components/DashboardRouteRenderer";
import AdminDashboard from "../../../../components/navigation/Dashboard/AdminDashboard";
import AdminActivityLog from "../../../../components/navigation/Log/AdminActivityLog";
import UserProfile from "../../../../components/navigation/Profile/UserProfile";
import FormSubmission from "../../../../components/navigation/Form/FormSubmission";
import CreatePost from "../../../../components/navigation/Post/CreatePost";
import PublishedPosts from "../../../../components/navigation/Post/PublishedPosts";
import ArchivedPosts from "../../../../components/navigation/Post/ArchivedPosts";
import ScheduledPosts from "../../../../components/navigation/Post/ScheduledPosts";
import CreateAnnouncement from "../../../../components/navigation/Post/CreateAnnouncement";
import ViewAllVolunteers from "../../../../components/navigation/Volunteer/ViewAllVolunteers";
import ApplicationApproval from "../../../../components/navigation/Volunteer/ApplicationApproval";
import ViewAllStaff from "../../../../components/navigation/Staff/ViewAllStaff";
import CreateEvent from "../../../../components/navigation/Event/CreateEvent";
import PublishedEvents from "../../../../components/navigation/Event/PublishedEvents";
import ArchivedEvents from "../../../../components/navigation/Event/ArchivedEvents";
import GeneralSettings from "../../../../components/navigation/Settings/GeneralSettings";
import Appearance from "../../../../components/navigation/Settings/Appearance";
import UserAccountSettings from "../../../../components/navigation/Settings/UserAccountSettings";

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
    defaultSub: "general-settings",
  },
};

function AdminViewAllVolunteers(props) {
  return (
    <ViewAllVolunteers profileBasePath="/dashboard/admin/profile" {...props} />
  );
}

function AdminViewAllStaff(props) {
  return <ViewAllStaff profileBasePath="/dashboard/admin/profile" {...props} />;
}

const adminSubRoutes = {
  "form-submission": {
    key: "form-submission",
    label: "Form Submission",
    parent: "hts-form",
    component: FormSubmission,
  },
  "create-post": {
    key: "create-post",
    label: "Create Post",
    parent: "manage-post",
    component: CreatePost,
  },
  "published-posts": {
    key: "published-posts",
    label: "Published Posts",
    parent: "manage-post",
    component: PublishedPosts,
  },
  "archived-posts": {
    key: "archived-posts",
    label: "Archived Posts",
    parent: "manage-post",
    component: ArchivedPosts,
  },
  "scheduled-posts": {
    key: "scheduled-posts",
    label: "Scheduled Posts",
    parent: "manage-post",
    component: ScheduledPosts,
  },
  "create-announcement": {
    key: "create-announcement",
    label: "Create Announcement",
    parent: "manage-post",
    component: CreateAnnouncement,
  },
  "view-all-volunteers": {
    key: "view-all-volunteers",
    label: "View All Volunteers",
    parent: "manage-volunteer",
    component: AdminViewAllVolunteers,
    withNavigate: true,
  },
  "application-approval": {
    key: "application-approval",
    label: "Application Approval",
    parent: "manage-volunteer",
    component: ApplicationApproval,
  },
  "view-all-staff": {
    key: "view-all-staff",
    label: "View All Staff",
    parent: "manage-staff",
    component: AdminViewAllStaff,
    withNavigate: true,
  },
  "create-event": {
    key: "create-event",
    label: "Create Event",
    parent: "manage-events",
    component: CreateEvent,
  },
  "published-events": {
    key: "published-events",
    label: "Published Events",
    parent: "manage-events",
    component: PublishedEvents,
  },
  "archived-events": {
    key: "archived-events",
    label: "Archived Events",
    parent: "manage-events",
    component: ArchivedEvents,
  },
  "general-settings": {
    key: "general-settings",
    label: "General Settings",
    parent: "settings",
    component: GeneralSettings,
  },
  appearance: {
    key: "appearance",
    label: "Appearance",
    parent: "settings",
    component: Appearance,
  },
  "user-account-settings": {
    key: "user-account-settings",
    label: "User & Account Settings",
    parent: "settings",
    component: UserAccountSettings,
  },
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
