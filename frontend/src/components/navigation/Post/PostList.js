"use client";

import { useState, useEffect } from "react";
import { getPosts } from "@/services/postService";
import {
  IoCreateOutline,
  IoEyeOutline,
  IoCalendarOutline,
  IoPersonOutline,
  IoDocumentAttachOutline,
} from "react-icons/io5";

export default function PostList({
  postType,
  defaultFilters = {},
  lockedFilters = {},
  managerActionsProvider,
  emptyState,
  onPostClick,
  refreshToken = 0,
  searchQuery = "",
}) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshToken, postType, lockedFilters.status, searchQuery]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      setError(null);
      const filters = { ...defaultFilters, ...lockedFilters, post_type: postType };
      const data = await getPosts(filters);
      
      // Apply search filter on client side
      let filteredData = data;
      if (searchQuery) {
        filteredData = data.filter((post) =>
          post.title.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
      
      setPosts(filteredData);
    } catch (err) {
      console.error("Error fetching posts:", err);
      setError(err.message || "Failed to load posts");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusBadge = (status) => {
    const styles = {
      published: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-100",
      draft: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
      scheduled: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-100",
      archived: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-100",
    };
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          styles[status] || styles.draft
        }`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="animate-pulse bg-gray-100 dark:bg-gray-700 rounded-lg h-24"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 mb-4">
          <IoDocumentAttachOutline className="w-8 h-8 text-gray-400 dark:text-gray-500" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          {emptyState?.title || "No posts found"}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {emptyState?.subtitle || "Create a new post to get started"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {posts.map((post) => {
        const actions = managerActionsProvider
          ? managerActionsProvider(post)
          : [];

        return (
          <div
            key={post.uid}
            onClick={() => onPostClick?.(post)}
            className="group relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 sm:p-4 hover:shadow-md hover:border-red-300 dark:hover:border-red-600 transition-all cursor-pointer"
          >
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-start sm:items-center gap-2 sm:gap-3 mb-2 flex-wrap">
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white hover:text-red-600 dark:hover:text-red-400 break-words">
                    {post.title}
                  </h3>
                  {getStatusBadge(post.status)}
                </div>

                <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-1">
                    <IoPersonOutline className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span className="truncate">{post.author_name || "Unknown"}</span>
                  </div>

                  {post.publish_at && (
                    <div className="flex items-center gap-1">
                      <IoCalendarOutline className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                      <span className="whitespace-nowrap">{formatDate(post.publish_at)}</span>
                    </div>
                  )}

                  {postType === "news_update" && post.attachments?.length > 0 && (
                    <div className="flex items-center gap-1">
                      <IoDocumentAttachOutline className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                      <span className="whitespace-nowrap">{post.attachments.length} file(s)</span>
                    </div>
                  )}
                </div>
              </div>

              {actions.length > 0 && (
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap sm:flex-nowrap" onClick={(e) => e.stopPropagation()}>
                  {actions.map((action, idx) => {
                    const ActionIcon = action.icon;
                    const isDanger = action.tone === "danger";
                    
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          action.onClick?.(post);
                        }}
                        disabled={action.loading}
                        className={`inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors ${
                          isDanger
                            ? "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                            : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                        title={action.label}
                      >
                        {ActionIcon && <ActionIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                        <span className="hidden sm:inline">{action.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
