import {
  IoCheckmarkDoneOutline,
  IoArchiveOutline,
  IoPauseOutline,
  IoConstructOutline,
  IoAlertCircleOutline,
  IoDocumentTextOutline,
} from "react-icons/io5";

export const EVENT_STATUS_TABS = [
  {
    key: "published",
    status: "published",
    label: "Published",
    description: "Live events open for volunteer registration.",
    icon: IoCheckmarkDoneOutline,
    managerActions: ["postpone", "archive", "edit", "cancel"],
    emptyState: {
      message: "There are no published events right now.",
    },
  },
  {
    key: "postponed",
    status: "postponed",
    label: "Postponed",
    description: "Events paused until a new schedule is announced.",
    icon: IoPauseOutline,
    managerActions: ["resume", "archive", "edit", "cancel"],
    emptyState: {
      title: "No postponed events",
      message: "Postponed events will appear here when you pause a live event.",
    },
  },
  {
    key: "draft",
    status: "draft",
    label: "Drafts",
    description: "Saved events that still need publishing.",
    icon: IoConstructOutline,
    managerActions: ["publish", "edit", "delete"],
    emptyState: {
      title: "No drafts yet",
      message: "Create an event draft to see it appear in this list.",
    },
  },
  {
    key: "archived",
    status: "archived",
    label: "Archived",
    description: "Completed and retired events kept for reference.",
    icon: IoArchiveOutline,
    managerActions: ["publish", "edit", "delete"],
    emptyState: {
      title: "No archived events",
      message: "Archive a finished event to keep it for reporting.",
    },
  },
  {
    key: "cancelled",
    status: "cancelled",
    label: "Cancelled",
    description: "Events that were cancelled for any reason.",
    icon: IoAlertCircleOutline,
    managerActions: ["delete"],
    emptyState: {
      title: "No cancelled events",
      message: "Cancelled events will show up here for record keeping.",
    },
  },
  {
    key: "completed",
    status: "completed",
    label: "Completed",
    description: "Events that successfully wrapped up.",
    icon: IoDocumentTextOutline,
    managerActions: [],
    emptyState: {
      title: "No completed events",
      message:
        "Completed events will appear as soon as attendance is finalized.",
    },
  },
];

export function getStatusConfigByKey(key) {
  return EVENT_STATUS_TABS.find((tab) => tab.key === key);
}
