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
    label: "Manage Post",
    icon: IoChatbubbleEllipsesOutline,
    defaultSubSection: "create-post",
    subSections: [
      { key: "create-post", label: "Create Post", icon: IoCreateOutline },
      {
        key: "published-posts",
        label: "Published Posts",
        icon: IoCheckmarkDoneOutline,
      },
      {
        key: "archived-posts",
        label: "Archived Posts",
        icon: IoArchiveOutline,
      },
      { key: "scheduled-posts", label: "Scheduled Posts", icon: IoTimeOutline },
      {
        key: "create-announcement",
        label: "Create Announcement",
        icon: IoMegaphoneOutline,
      },
    ],
  },
  "manage-volunteer": {
    label: "Manage Volunteer",
    icon: IoPeopleOutline,
    defaultSubSection: "view-all-volunteers",
    subSections: [
      {
        key: "view-all-volunteers",
        label: "View All Volunteers",
        icon: IoEyeOutline,
      },
      {
        key: "application-approval",
        label: "Application Approval",
        icon: IoCheckmarkCircleOutline,
      },
    ],
  },
  "manage-staff": {
    label: "Manage Staff",
    icon: IoPersonOutline,
    defaultSubSection: "view-all-staff",
    subSections: [
      { key: "view-all-staff", label: "View All Staff", icon: IoPeopleOutline },
    ],
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
    label: "Manage Post",
    icon: IoChatbubbleEllipsesOutline,
    defaultSubSection: "create-post",
    subSections: [
      { key: "create-post", label: "Create Post", icon: IoCreateOutline },
      {
        key: "published-posts",
        label: "Published Posts",
        icon: IoCheckmarkDoneOutline,
      },
      {
        key: "archived-posts",
        label: "Archived Posts",
        icon: IoArchiveOutline,
      },
      { key: "scheduled-posts", label: "Scheduled Posts", icon: IoTimeOutline },
      {
        key: "create-announcement",
        label: "Create Announcement",
        icon: IoMegaphoneOutline,
      },
    ],
  },
  "manage-volunteer": {
    label: "Manage Volunteer",
    icon: IoPeopleOutline,
    defaultSubSection: "view-all-volunteers",
    subSections: [
      {
        key: "view-all-volunteers",
        label: "View All Volunteers",
        icon: IoEyeOutline,
      },
      {
        key: "application-approval",
        label: "Application Approval",
        icon: IoCheckmarkCircleOutline,
      },
    ],
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
