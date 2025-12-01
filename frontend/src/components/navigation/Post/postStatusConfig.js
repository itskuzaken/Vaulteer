import {
  IoDocumentTextOutline,
  IoCheckmarkCircleOutline,
  IoTimeOutline,
  IoArchiveOutline,
  IoListOutline,
} from "react-icons/io5";

export const POST_STATUS_TABS = [
  {
    key: "all",
    label: "All Posts",
    status: "",
    icon: IoListOutline,
    description: "View all posts across all statuses",
    emptyState: {
      title: "No posts found",
      subtitle: "Create your first post to get started",
    },
  },
  {
    key: "published",
    label: "Published",
    status: "published",
    icon: IoCheckmarkCircleOutline,
    description: "Posts that are live and visible",
    emptyState: {
      title: "No published posts",
      subtitle: "Publish a draft or create a new post",
    },
  },
  {
    key: "draft",
    label: "Drafts",
    status: "draft",
    icon: IoDocumentTextOutline,
    description: "Posts in draft status",
    emptyState: {
      title: "No drafts",
      subtitle: "Save a post as draft to see it here",
    },
  },
  {
    key: "scheduled",
    label: "Scheduled",
    status: "scheduled",
    icon: IoTimeOutline,
    description: "Posts scheduled for future publication",
    emptyState: {
      title: "No scheduled posts",
      subtitle: "Schedule a post for future publication",
    },
  },
  {
    key: "archived",
    label: "Archived",
    status: "archived",
    icon: IoArchiveOutline,
    description: "Archived posts",
    emptyState: {
      title: "No archived posts",
      subtitle: "Archive published posts to see them here",
    },
  },
];
