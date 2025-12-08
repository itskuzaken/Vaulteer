"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  IoAddCircleOutline,
  IoCreateOutline,
  IoArchiveOutline,
  IoTrashOutline,
  IoCheckmarkCircleOutline,
  IoSearchOutline,
  IoDocumentTextOutline,
  IoArrowUndoOutline,
} from "react-icons/io5";
import PostForm from "./PostForm";
import PostList from "./PostList";
import { POST_STATUS_TABS } from "./postStatusConfig";
import { useNotify } from "@/components/ui/NotificationProvider";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import { buildPostDetailPath } from "@/utils/dashboardRouteHelpers";
import {
  createPost,
  updatePost,
  publishPost,
  archivePost,
  unarchivePost,
  deletePost,
  getPostByUid,
} from "@/services/postService";

function NewsUpdatesContent({ onNavigate, currentUser }) {
  const notify = useNotify();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState(POST_STATUS_TABS[0]?.key);
  const [refreshToken, setRefreshToken] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeView, setActiveView] = useState("list");
  const [editingPost, setEditingPost] = useState(null);
  const suppressEditEffect = useRef(false);
  const clearEditParamAndSuppress = useCallback(() => {
    try {
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        let changed = false;
        if (url.searchParams.has("editPostUid")) {
          url.searchParams.delete("editPostUid");
          changed = true;
        }
        if (url.searchParams.has("postUid")) {
          url.searchParams.delete("postUid");
          changed = true;
        }
        if (changed) {
          router.replace(url.pathname + url.search);
        }
      }
    } catch (err) {
      console.error("Failed to update URL after navigating back from edit", err);
    }
    suppressEditEffect.current = true;
    setTimeout(() => {
      suppressEditEffect.current = false;
    }, 0);
  }, [router]);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [archiveTarget, setArchiveTarget] = useState(null);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [loadingPosts, setLoadingPosts] = useState(new Set());

  // Check for editPostUid parameter and fetch post for editing
  useEffect(() => {
    const editPostUid = searchParams.get("editPostUid");
    if (editPostUid && !editingPost && !suppressEditEffect.current) {
      getPostByUid(editPostUid)
        .then((post) => {
          if (post && post.post_type === "news_update") {
            setEditingPost(post);
            setActiveView("edit");
          }
        })
        .catch((error) => {
          console.error("Failed to load post for editing:", error);
          notify?.push("Failed to load post for editing", "error");
        });
    }
  }, [searchParams, editingPost, notify]);

  const activeConfig = useMemo(() => {
    return (
      POST_STATUS_TABS.find((tab) => tab.key === activeTab) ||
      POST_STATUS_TABS[0]
    );
  }, [activeTab]);

  const ActiveIcon = activeConfig?.icon;

  const statusFilter = useMemo(
    () => ({ status: activeConfig?.status || "" }),
    [activeConfig]
  );

  const triggerRefresh = useCallback(() => {
    setRefreshToken((prev) => prev + 1);
  }, []);

  const runInlineMutation = useCallback(
    async (postUid, mutation, successMessage) => {
      setLoadingPosts(prev => new Set(prev).add(postUid));
      try {
        await mutation();
        if (successMessage) {
          notify?.push(successMessage, "success");
        }
        triggerRefresh();
      } catch (error) {
        console.error("Post action failed", error);
        notify?.push(error?.message || "Action failed", "error");
      } finally {
        setLoadingPosts(prev => {
          const next = new Set(prev);
          next.delete(postUid);
          return next;
        });
      }
    },
    [notify, triggerRefresh]
  );

  const handleCreateClick = useCallback(() => {
    setEditingPost(null);
    setActiveView("create");
  }, []);

  const handleEditClick = useCallback((post) => {
    setEditingPost(post);
    setActiveView("edit");
  }, []);

  const handlePostClick = useCallback((post) => {
    const role = window.location.pathname.includes("/admin") ? "admin" : "staff";
    const detailPath = buildPostDetailPath(role, post.uid);
    if (detailPath) {
      router.push(detailPath);
    }
  }, [router]);

  const handleBackToList = useCallback(() => {
    clearEditParamAndSuppress();
    setActiveView("list");
    setEditingPost(null);
  }, [clearEditParamAndSuppress]);

  const handleArchive = useCallback(
    (post) =>
      runInlineMutation(
        post.uid,
        () => archivePost(post.uid),
        "Post archived successfully"
      ),
    [runInlineMutation]
  );

  const handleUnarchive = useCallback(
    (post) =>
      runInlineMutation(
        post.uid,
        () => unarchivePost(post.uid),
        "Post unarchived successfully"
      ),
    [runInlineMutation]
  );

  const handlePublish = useCallback(
    (post) =>
      runInlineMutation(
        post.uid,
        () => publishPost(post.uid),
        "Post published successfully"
      ),
    [runInlineMutation]
  );

  const handleDeleteClick = useCallback((post) => {
    setDeleteTarget(post);
  }, []);

  const handleArchiveClick = useCallback((post) => {
    setArchiveTarget(post);
  }, []);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setModalSubmitting(true);
    try {
      await deletePost(deleteTarget.uid);
      notify?.push("Post deleted successfully", "success");
      setDeleteTarget(null);
      triggerRefresh();
    } catch (error) {
      console.error("Failed to delete post", error);
      notify?.push(error?.message || "Failed to delete post", "error");
    } finally {
      setModalSubmitting(false);
    }
  }, [deleteTarget, notify, triggerRefresh]);

  const handleArchiveConfirm = useCallback(async () => {
    if (!archiveTarget) return;
    setModalSubmitting(true);
    try {
      await archivePost(archiveTarget.uid);
      notify?.push("Post archived successfully", "success");
      setArchiveTarget(null);
      triggerRefresh();
    } catch (error) {
      console.error("Failed to archive post", error);
      notify?.push(error?.message || "Failed to archive post", "error");
    } finally {
      setModalSubmitting(false);
    }
  }, [archiveTarget, notify, triggerRefresh]);

  const handleSaveDraft = useCallback(
    async (postData) => {
      try {
        if (activeView === "create") {
          await createPost({ ...postData, post_type: "news_update", status: "draft" });
          notify?.push("Draft saved successfully", "success");
        } else {
          await updatePost(editingPost.uid, { ...postData, status: "draft" });
          notify?.push("Draft updated successfully", "success");
        }
        triggerRefresh();
        clearEditParamAndSuppress();
        handleBackToList();
      } catch (error) {
        notify?.push(error?.message || "Failed to save draft", "error");
      }
    },
    [activeView, editingPost, notify, triggerRefresh, handleBackToList, clearEditParamAndSuppress]
  );

  const handlePublishPost = useCallback(
    async (postData) => {
      try {
        if (activeView === "create") {
          await createPost({
            ...postData,
            post_type: "news_update",
            status: "published",
          });
          notify?.push("Post published successfully", "success");
        } else {
          await updatePost(editingPost.uid, { ...postData, status: "published" });
          notify?.push("Post published successfully", "success");
        }
        triggerRefresh();
        clearEditParamAndSuppress();
        handleBackToList();
      } catch (error) {
        notify?.push(error?.message || "Failed to publish post", "error");
      }
    },
    [activeView, editingPost, notify, triggerRefresh, handleBackToList, clearEditParamAndSuppress]
  );

  const managerActionsProvider = useCallback(
    (post) => {
      const isLoading = loadingPosts.has(post.uid);
      const actions = [];

      // Only show edit button if current user is the post author
      const isAuthor = currentUser?.user_id && post.author_id && currentUser.user_id == post.author_id;
      if (isAuthor) {
        actions.push({
          label: "Edit",
          icon: IoCreateOutline,
          onClick: () => handleEditClick(post),
          loading: isLoading,
        });
      }

      if (post.status === "draft") {
        actions.push({
          label: "Publish",
          icon: IoCheckmarkCircleOutline,
          onClick: () => handlePublish(post),
          loading: isLoading,
        });
        actions.push({
          label: "Delete",
          icon: IoTrashOutline,
          tone: "danger",
          onClick: () => handleDeleteClick(post),
          loading: isLoading,
        });
      }

      if (post.status === "published" || post.status === "scheduled") {
        actions.push({
          label: "Archive",
          icon: IoArchiveOutline,
          onClick: () => handleArchiveClick(post),
          loading: isLoading,
        });
      }

      if (post.status === "archived") {
        actions.push({
          label: "Unarchive",
          icon: IoArrowUndoOutline,
          onClick: () => handleUnarchive(post),
          loading: isLoading,
        });
      }

      return actions;
    },
    [
      loadingPosts,
      currentUser,
      handleEditClick,
      handlePublish,
      handleDeleteClick,
      handleArchiveClick,
      handleUnarchive,
    ]
  );

  if (activeView !== "list") {
    return (
      <PostForm
        mode={activeView}
        postType="news_update"
        initialData={editingPost}
        onSaveDraft={handleSaveDraft}
        onPublish={handlePublishPost}
        onBack={handleBackToList}
      />
    );
  }

  return (
    <>
      <div className="flex justify-center w-full">
        <div className="w-full max-w-7xl">
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-md overflow-hidden">
            <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
              {/* Header */}
              <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-red-100 text-red-600 ring-4 sm:ring-8 ring-red-100/60 dark:bg-red-900/40 dark:text-red-100 dark:ring-red-900/10">
                    {ActiveIcon ? <ActiveIcon className="h-5 w-5 sm:h-6 sm:w-6" /> : <IoDocumentTextOutline className="h-5 w-5 sm:h-6 sm:w-6" />}
                  </span>
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                      News & Updates
                    </h1>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                      Manage news posts with file attachments
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCreateClick}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-gray-200 bg-white px-4 sm:px-5 py-2 text-sm font-semibold text-gray-800 shadow-sm transition-all hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 w-full sm:w-auto"
                >
                  <IoAddCircleOutline className="h-5 w-5" />
                  <span>Create Post</span>
                </button>
              </div>

              {/* Status Tabs */}
              <div className="flex overflow-x-auto items-center gap-2 sm:gap-3 pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
                {POST_STATUS_TABS.map((tab) => {
                  const isActive = tab.key === activeTab;
                  const TabIcon = tab.icon;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveTab(tab.key)}
                      className={`flex-shrink-0 rounded-full border px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold transition-colors ${
                        isActive
                          ? "border-gray-900 bg-gray-900 text-white shadow-lg shadow-gray-800/40 dark:border-white dark:bg-white dark:text-gray-900"
                          : "border-transparent bg-gray-100 text-gray-600 hover:border-gray-300 hover:text-gray-900 dark:bg-gray-800 dark:text-gray-300"
                      }`}
                    >
                      <span className="flex items-center gap-1.5 sm:gap-2">
                        {TabIcon ? <TabIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : null}
                        <span className="whitespace-nowrap">{tab.label}</span>
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Search */}
              <div className="relative max-w-md">
                <IoSearchOutline className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search posts by title..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>

              <div className="border-t border-gray-100 dark:border-gray-700" />

              {/* Post List */}
              <PostList
                postType="news_update"
                defaultFilters={statusFilter}
                lockedFilters={statusFilter}
                managerActionsProvider={managerActionsProvider}
                emptyState={activeConfig?.emptyState}
                onPostClick={handlePostClick}
                refreshToken={refreshToken}
                searchQuery={searchQuery}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Delete Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Delete Post
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Are you sure you want to delete &quot;{deleteTarget.title}&quot;? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={modalSubmitting}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={modalSubmitting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {modalSubmitting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Archive Modal */}
      {archiveTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Archive Post
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Are you sure you want to archive &quot;{archiveTarget.title}&quot;?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setArchiveTarget(null)}
                disabled={modalSubmitting}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleArchiveConfirm}
                disabled={modalSubmitting}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
              >
                {modalSubmitting ? "Archiving..." : "Archive"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function NewsUpdates(props) {
  return (
    <ErrorBoundary>
      <NewsUpdatesContent {...props} />
    </ErrorBoundary>
  );
}
