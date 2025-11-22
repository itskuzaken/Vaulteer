"use client";

import DashboardRouteRenderer from "../../_components/DashboardRouteRenderer";
import StaffDashboard from "../../../../components/navigation/Dashboard/StaffDashboard";
import StaffActivityLog from "../../../../components/navigation/Log/StaffActivityLog";
import UserProfile from "../../../../components/navigation/Profile/UserProfile";
import FormSubmission from "../../../../components/navigation/Form/FormSubmission";
import CreatePost from "../../../../components/navigation/Post/CreatePost";
import PublishedPosts from "../../../../components/navigation/Post/PublishedPosts";
import ArchivedPosts from "../../../../components/navigation/Post/ArchivedPosts";
import ScheduledPosts from "../../../../components/navigation/Post/ScheduledPosts";
import CreateAnnouncement from "../../../../components/navigation/Post/CreateAnnouncement";
import ViewAllVolunteers from "../../../../components/navigation/Volunteer/ViewAllVolunteers";
import ApplicationApproval from "../../../../components/navigation/Volunteer/ApplicationApproval";
import ManageEvents from "../../../../components/navigation/Event/ManageEvents";
import EventDetailsContent from "../../../../components/navigation/Event/EventDetailsContent";
import CreateEvent from "../../../../components/navigation/Event/CreateEvent";
import GeneralSettings from "../../../../components/navigation/Settings/GeneralSettings";
import Appearance from "../../../../components/navigation/Settings/Appearance";
import UserAccountSettings from "../../../../components/navigation/Settings/UserAccountSettings";

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
    defaultSub: "general-settings",
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

function StaffViewAllVolunteers(props) {
  return (
    <ViewAllVolunteers profileBasePath="/dashboard/staff/profile" {...props} />
  );
}

const staffSubRoutes = {
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
    component: StaffViewAllVolunteers,
    withNavigate: true,
  },
  "application-approval": {
    key: "application-approval",
    label: "Application Approval",
    parent: "manage-volunteer",
    component: ApplicationApproval,
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
