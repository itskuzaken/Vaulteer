"use client";

import DashboardRouteRenderer from "../../_components/DashboardRouteRenderer";
import VolunteerDashboard from "../../../../components/navigation/Dashboard/VolunteerDashboard";
import VolunteerActivityLog from "../../../../components/navigation/Log/VolunteerActivityLog";
import UserProfile from "../../../../components/navigation/Profile/UserProfile";
import HTSFormManagement from "../../../../components/navigation/Form/HTSFormManagement";
import EventDetailsContent from "../../../../components/navigation/Event/EventDetailsContent";
import MyEvents from "../../../../components/navigation/Event/MyEvents";
import PostDetailsContent from "../../../../components/navigation/Post/PostDetailsContent";

import UserSettings from "../../../../components/navigation/Settings/UserSettings";
import NotificationsPage from "../../../../components/notifications/NotificationsPage";
import LeaderboardPage from "../../../../components/leaderboard/LeaderboardPage";
import AchievementCatalogPage from "../../../../components/navigation/Gamification/AchievementCatalogPage";

const volunteerMainRoutes = {
  dashboard: {
    label: "Dashboard",
    component: VolunteerDashboard,
    withNavigate: true,
  },
  "my-events": {
    label: "My Events",
    component: MyEvents,
  },
  "my-activity": {
    label: "My Activity",
    component: VolunteerActivityLog,
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
  leaderboard: {
    label: "Leaderboard",
    component: LeaderboardPage,
  },
  achievements: {
    label: "Achievements",
    component: AchievementCatalogPage,
  },
  "hts-forms": {
    label: "HTS Forms",
    component: HTSFormManagement,
  },
  event: {
    label: "Event Details",
    component: EventDetailsContent,
    withNavigate: true,
  },
  post: {
    label: "Post Details",
    component: PostDetailsContent,
    withNavigate: true,
  },
};

const volunteerSubRoutes = {};

export default function VolunteerDashboardPage({
  contentSlug,
  subContentSlug,
  routingStrategy = "path",
}) {
  return (
    <DashboardRouteRenderer
      role="volunteer"
      basePath="/dashboard/volunteer"
      contentSlug={contentSlug}
      subContentSlug={subContentSlug}
      defaultContent="dashboard"
      mainRoutes={volunteerMainRoutes}
      subRoutes={volunteerSubRoutes}
      routingStrategy={routingStrategy}
      settingsRoute={{ content: "settings" }}
    />
  );
}
