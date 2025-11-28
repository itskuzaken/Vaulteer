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
import ManageEvents from "../../../../components/navigation/Event/ManageEvents";
import EventDetailsContent from "../../../../components/navigation/Event/EventDetailsContent";
import CreateEvent from "../../../../components/navigation/Event/CreateEvent";
import UserSettings from "../../../../components/navigation/Settings/UserSettings";

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
  "manage-events": {
    label: "Manage Events",
    component: ManageEvents,
    withNavigate: true,
  },
  event: {
    label: "Event Details",
    component: EventDetailsContent,
    withNavigate: true,
    sidebarKey: "manage-events",
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

function AdminApplicationApproval(props) {
  return (
    <ApplicationApproval
      profileBasePath="/dashboard/admin/profile"
      {...props}
    />
  );
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
  "create-event": {
    key: "create-event",
    label: "Create Event",
    parent: "manage-events",
    component: CreateEvent,
    withNavigate: true,
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
    component: AdminApplicationApproval,
    withNavigate: true,
  },
  "view-all-staff": {
    key: "view-all-staff",
    label: "View All Staff",
    parent: "manage-staff",
    component: AdminViewAllStaff,
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
