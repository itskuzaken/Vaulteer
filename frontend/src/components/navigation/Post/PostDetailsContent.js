"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import PostDetailsPage from "@/components/posts/PostDetailsPage";
import { useNotify } from "@/components/ui/NotificationProvider";

export default function PostDetailsContent({ currentUser, onNavigate }) {
  const notify = useNotify();
  const router = useRouter();
  const searchParams = useSearchParams();
  const postUid = searchParams.get("postUid");
  const normalizedRole = (currentUser?.role || "volunteer").toLowerCase();
  const fallbackContent =
    normalizedRole === "admin" || normalizedRole === "staff"
      ? "manage-post"
      : "dashboard";
  const fallbackSubContent = "news-updates";

  useEffect(() => {
    if (postUid) {
      return;
    }

    notify?.push("Select a post from the list to view its details.", "info");

    if (typeof onNavigate === "function") {
      onNavigate(fallbackContent, fallbackSubContent, {
        replace: true,
      });
    }
  }, [postUid, fallbackContent, fallbackSubContent, notify, onNavigate]);

  if (!postUid) {
    return null;
  }

  const handleBack = () => {
    if (typeof onNavigate === "function") {
      onNavigate(fallbackContent, fallbackSubContent);
    }
  };

  const handleEdit = (post) => {
    // Navigate to manage-post with subContent and pass post UID as URL parameter
    if (typeof onNavigate === "function") {
      const subContent = post.post_type === "news_update" ? "news-updates" : "announcements";
      onNavigate(fallbackContent, subContent, { 
        extraParams: { editPostUid: post.uid }
      });
    }
  };

  return (
    <PostDetailsPage
      postUid={postUid}
      currentUser={currentUser}
      onBack={handleBack}
      onEdit={handleEdit}
    />
  );
}
