import {
  IoDocumentTextOutline,
  IoChatbubbleEllipsesOutline,
  IoPeopleOutline,
  IoPersonOutline,
  IoCalendarOutline,
  IoCreateOutline,
  IoCheckmarkDoneOutline,
  IoArchiveOutline,
  IoTimeOutline,
  IoMegaphoneOutline,
  IoEyeOutline,
  IoCheckmarkCircleOutline,
  IoAnalyticsOutline,
  IoGridOutline,
} from "react-icons/io5";

const adminMenu = {
  dashboard: {
    label: "Dashboard",
    icon: IoGridOutline,
    subSections: [],
  },
  "hts-form": {
    label: "HTS Form",
    icon: IoDocumentTextOutline,
    defaultSubSection: "form-submission",
    subSections: [
      {
        key: "form-submission",
        label: "Form Submission",
        icon: IoDocumentTextOutline,
      },
    ],
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
};

const staffMenu = {
  dashboard: {
    label: "Dashboard",
    icon: IoGridOutline,
    subSections: [],
  },
  "hts-form": {
    label: "HTS Form",
    icon: IoDocumentTextOutline,
    defaultSubSection: "form-submission",
    subSections: [
      {
        key: "form-submission",
        label: "Form Submission",
        icon: IoDocumentTextOutline,
      },
    ],
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
  "my-events": {
    label: "My Events",
    icon: IoCalendarOutline,
    subSections: [],
  },
  forms: {
    label: "Forms",
    icon: IoDocumentTextOutline,
    defaultSubSection: "submit-form",
    subSections: [
      { key: "submit-form", label: "Submit Form", icon: IoCreateOutline },
      { key: "view-submitted", label: "View Submitted", icon: IoEyeOutline },
    ],
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
