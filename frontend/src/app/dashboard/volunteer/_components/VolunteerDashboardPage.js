"use client";

import DashboardRouteRenderer from "../../_components/DashboardRouteRenderer";
import VolunteerDashboard from "../../../../components/navigation/Dashboard/VolunteerDashboard";
import VolunteerActivityLog from "../../../../components/navigation/Log/VolunteerActivityLog";
import UserProfile from "../../../../components/navigation/Profile/UserProfile";
import SubmitForm from "../../../../components/navigation/Form/SubmitForm";
import ViewSubmitted from "../../../../components/navigation/Form/ViewSubmitted";

const volunteerMainRoutes = {
  dashboard: {
    label: "Dashboard",
    component: VolunteerDashboard,
    withNavigate: true,
  },
  "my-activity": {
    label: "My Activity",
    component: VolunteerActivityLog,
  },
  profile: {
    label: "Profile",
    component: UserProfile,
  },
};

const volunteerSubRoutes = {
  "submit-form": {
    key: "submit-form",
    label: "Submit Form",
    parent: "forms",
    component: SubmitForm,
  },
  "view-submitted": {
    key: "view-submitted",
    label: "View Submitted",
    parent: "forms",
    component: ViewSubmitted,
  },
};

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
      settingsRoute={null}
      onSettingsClickOverride={() => {
        window.alert("Settings feature coming soon!");
      }}
    />
  );
}
