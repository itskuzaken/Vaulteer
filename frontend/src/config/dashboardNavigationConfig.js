import {
  IoDocumentTextOutline,
  IoChatbubbleEllipsesOutline,
  IoPeopleOutline,
  IoPersonOutline,
  IoCalendarOutline,
  IoMegaphoneOutline,
  IoCheckmarkCircleOutline,
  IoAnalyticsOutline,
  IoGridOutline,
  IoSettingsOutline,
  IoTrophyOutline,
  IoNotificationsOutline,
  IoServerOutline,
  IoScanOutline,
  IoPodiumOutline
} from "react-icons/io5";

const adminMenu = {
  dashboard: {
    label: "Dashboard",
    icon: IoGridOutline,
    subSections: [],
  },
  "leaderboard": {
    label: "Leaderboard",
    icon: IoPodiumOutline,
    subSections: [],
  },
  "hts-forms": {
    label: "HTS Forms",
    icon: IoDocumentTextOutline,
    subSections: [],
  },
  "manage-post": {
    label: "Manage Posts",
    icon: IoChatbubbleEllipsesOutline,
    defaultSubSection: "news-updates",
    subSections: [
      {
        key: "news-updates",
        label: "News & Updates",
        icon: IoDocumentTextOutline,
      },
      {
        key: "announcements",
        label: "Announcements",
        icon: IoMegaphoneOutline,
      },
    ],
  },
  "manage-volunteer": {
    label: "Manage Volunteer",
    icon: IoPeopleOutline,
    subSections: [],
  },
  "manage-staff": {
    label: "Manage Staff",
    icon: IoPersonOutline,
    subSections: [],
  },
  "manage-applications": {
    label: "Manage Applications",
    icon: IoCheckmarkCircleOutline,
    subSections: [],
  },
  "manage-events": {
    label: "Manage Events",
    icon: IoCalendarOutline,
    subSections: [],
  },
  "activity-logs": {
    label: "Activity Logs",
    icon: IoAnalyticsOutline,
    subSections: [],
  },
  "system-settings": {
    label: "System Settings",
    icon: IoSettingsOutline,
    defaultSubSection: "gamification",
    subSections: [
      {
        key: "gamification",
        label: "Gamification",
        icon: IoTrophyOutline,
      },
      {
        key: "events",
        label: "Events",
        icon: IoCalendarOutline,
      },
      {
        key: "notifications",
        label: "Notifications",
        icon: IoNotificationsOutline,
      },
      {
        key: "system",
        label: "System",
        icon: IoServerOutline,
      },
      {
        key: "ocr",
        label: "OCR",
        icon: IoScanOutline,
      },
    ],
  },
};

const staffMenu = {
  dashboard: {
    label: "Dashboard",
    icon: IoGridOutline,
    subSections: [],
  },
  "leaderboard": {
    label: "Leaderboard",
    icon: IoPodiumOutline,
    subSections: [],
  },
  "hts-forms": {
    label: "HTS Forms",
    icon: IoDocumentTextOutline,
    subSections: [],
  },
  "manage-post": {
    label: "Manage Posts",
    icon: IoChatbubbleEllipsesOutline,
    defaultSubSection: "news-updates",
    subSections: [
      {
        key: "news-updates",
        label: "News & Updates",
        icon: IoDocumentTextOutline,
      },
      {
        key: "announcements",
        label: "Announcements",
        icon: IoMegaphoneOutline,
      },
    ],
  },
  "manage-volunteer": {
    label: "Manage Volunteer",
    icon: IoPeopleOutline,
    subSections: [],
  },
  "manage-applications": {
    label: "Manage Applications",
    icon: IoCheckmarkCircleOutline,
    subSections: [],
  },
  "manage-events": {
    label: "Manage Events",
    icon: IoCalendarOutline,
    subSections: [],
  },
  "my-activity": {
    label: "My Activity",
    icon: IoAnalyticsOutline,
    subSections: [],
  },
};

const volunteerMenu = {
  dashboard: {
    label: "Dashboard",
    icon: IoGridOutline,
    subSections: [],
  },
  "leaderboard": {
    label: "Leaderboard",
    icon: IoPodiumOutline,
    subSections: [],
  },
  "my-events": {
    label: "My Events",
    icon: IoCalendarOutline,
    subSections: [],
  },
  "achievements": {
    label: "Achievements",
    icon: IoTrophyOutline,
    subSections: [],
  },
  "hts-forms": {
    label: "HTS Forms",
    icon: IoDocumentTextOutline,
    subSections: [],
  },
  "my-activity": {
    label: "My Activity",
    icon: IoAnalyticsOutline,
    subSections: [],
  },
};

const menuByRole = {
  admin: adminMenu,
  staff: staffMenu,
  volunteer: volunteerMenu,
};

export function getDashboardMenu(role) {
  return menuByRole[role] || adminMenu;
}

export function getMenuEntry(role, key) {
  const menu = getDashboardMenu(role);
  return menu[key];
}
