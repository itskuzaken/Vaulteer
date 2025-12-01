"use client";

import { useState, useEffect } from "react";
import PostForm from "./PostForm";
import { useNotify } from "../../ui/NotificationProvider";
import {
  getPosts,
  createPost,
  updatePost,
  archivePost,
  deletePost,
  publishPost,
} from "../../../services/postService";

/**
 * ManagePost Component
 * Main component for managing News & Updates and Announcements
 * Features tabbed interface with inline create/edit workflows
 */
export default function ManagePost() {
  const notify = useNotify();
  const [activeTab, setActiveTab] = useState("news_update"); // 'news_update' or 'announcement'
  const [activeView, setActiveView] = useState("list"); // 'list', 'create', 'edit'
  const [selectedPost, setSelectedPost] = useState(null);
  const [posts, setPosts] = useState([]);
  const [filteredPosts, setFilteredPosts] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState(null);
  const [postToArchive, setPostToArchive] = useState(null);

  // Fetch posts when tab changes
  useEffect(() => {
    fetchPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Filter posts when status filter or search query changes
  useEffect(() => {
    filterPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts, statusFilter, searchQuery]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const data = await getPosts({ post_type: activeTab });
      setPosts(data);
    } catch (error) {
      console.error("Error fetching posts:", error);
      notify?.push(error.message || "Failed to fetch posts", "error");
    } finally {
      setLoading(false);
    }
  };

  const filterPosts = () => {
    let filtered = [...posts];

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((post) => post.status === statusFilter);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((post) =>
        post.title.toLowerCase().includes(query)
      );
    }

    setFilteredPosts(filtered);
  };

  const handleCreatePost = async (payload) => {
    try {
      await createPost(payload);
      await fetchPosts();
      setActiveView("list");
    } catch (error) {
      throw error;
    }
  };

  const handleUpdatePost = async (payload) => {
    try {
      if (selectedPost) {
        await updatePost(selectedPost.uid, payload);
        await fetchPosts();
        setActiveView("list");
        setSelectedPost(null);
      }
    } catch (error) {
      throw error;
    }
  };

  const handlePublishPost = async (uid) => {
    try {
      await publishPost(uid);
      await fetchPosts();
      notify?.push("Post published successfully", "success");
    } catch (error) {
      console.error("Error publishing post:", error);
      notify?.push(error.message || "Failed to publish post", "error");
    }
  };

  const handleArchivePost = async () => {
    if (!postToArchive) return;

    try {
      await archivePost(postToArchive.uid);
      await fetchPosts();
      setArchiveModalOpen(false);
      setPostToArchive(null);
      notify?.push("Post archived successfully", "success");
    } catch (error) {
      console.error("Error archiving post:", error);
      notify?.push(error.message || "Failed to archive post", "error");
    }
  };

  const handleDeletePost = async () => {
    if (!postToDelete) return;

    try {
      await deletePost(postToDelete.uid);
      await fetchPosts();
      setDeleteModalOpen(false);
      setPostToDelete(null);
      notify?.push("Post deleted successfully", "success");
    } catch (error) {
      console.error("Error deleting post:", error);
      notify?.push(error.message || "Failed to delete post", "error");
    }
  };

  const handleEdit = (post) => {
    setSelectedPost(post);
    setActiveView("edit");
  };

  const handleBackToList = () => {
    setActiveView("list");
    setSelectedPost(null);
  };

  const openDeleteModal = (post) => {
    setPostToDelete(post);
    setDeleteModalOpen(true);
  };

  const openArchiveModal = (post) => {
    setPostToArchive(post);
    setArchiveModalOpen(true);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusBadgeColor = (status) => {
    const colors = {
      published: "bg-green-100 text-green-800",
      draft: "bg-gray-100 text-gray-800",
      scheduled: "bg-blue-100 text-blue-800",
      archived: "bg-yellow-100 text-yellow-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  // If showing form (create or edit), render PostForm
  if (activeView === "create") {
    return (
      <PostForm
        mode="create"
        postType={activeTab}
        onSaveDraft={handleCreatePost}
        onPublish={handleCreatePost}
        onBack={handleBackToList}
      />
    );
  }

  if (activeView === "edit") {
    return (
      <PostForm
        mode="edit"
        postType={activeTab}
        initialData={selectedPost}
        onSaveDraft={handleUpdatePost}
        onPublish={handleUpdatePost}
        onBack={handleBackToList}
      />
    );
  }

  // Main list view
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Manage Posts</h1>
        <button
          onClick={() => setActiveView("create")}
          className="px-4 sm:px-6 py-2 text-sm sm:text-base bg-[var(--primary-red)] text-white rounded-lg hover:bg-[var(--dark)] transition flex items-center justify-center space-x-2 w-full sm:w-auto"
        >
          <svg
            className="w-4 h-4 sm:w-5 sm:h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          <span>Create Post</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="border-b border-gray-200">
          <div className="flex overflow-x-auto scrollbar-hide">
            <button
              onClick={() => {
                setActiveTab("news_update");
                setStatusFilter("all");
                setSearchQuery("");
              }}
              className={`px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base font-medium transition whitespace-nowrap flex-shrink-0 ${
                activeTab === "news_update"
                  ? "text-[var(--primary-red)] border-b-2 border-[var(--primary-red)]"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              News & Updates
            </button>
            <button
              onClick={() => {
                setActiveTab("announcement");
                setStatusFilter("all");
                setSearchQuery("");
              }}
              className={`px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base font-medium transition whitespace-nowrap flex-shrink-0 ${
                activeTab === "announcement"
                  ? "text-[var(--primary-red)] border-b-2 border-[var(--primary-red)]"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              Announcements
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="p-3 sm:p-4 border-b border-gray-200 space-y-3">
          {/* Search */}
          <div className="w-full">
            <input
              type="text"
              placeholder="Search by title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--primary-red)] focus:border-transparent"
            />
          </div>

          {/* Status Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
            {["all", "published", "draft", "scheduled", "archived"].map(
              (status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition whitespace-nowrap flex-shrink-0 ${
                    statusFilter === status
                      ? "bg-[var(--primary-red)] text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              )
            )}
          </div>
        </div>

        {/* Posts Table */}
        <div className="p-4">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary-red)]"></div>
              <p className="mt-2 text-gray-600">Loading posts...</p>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="text-center py-12">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="mt-2 text-gray-600">No posts found</p>
              <button
                onClick={() => setActiveView("create")}
                className="mt-4 text-[var(--primary-red)] hover:underline"
              >
                Create your first post
              </button>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Title
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Author
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Published
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredPosts.map((post) => (
                    <tr key={post.uid} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <div className="font-medium text-gray-900">
                          {post.title}
                        </div>
                        {post.attachments && post.attachments.length > 0 && (
                          <div className="text-xs text-gray-500 mt-1">
                            {post.attachments.length} attachment(s)
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        {post.author_name}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(
                            post.status
                          )}`}
                        >
                          {post.status.charAt(0).toUpperCase() +
                            post.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        {post.status === "scheduled"
                          ? `Scheduled: ${formatDate(post.scheduled_for)}`
                          : formatDate(post.publish_at)}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {/* Edit Button */}
                          <button
                            onClick={() => handleEdit(post)}
                            className="text-blue-600 hover:text-blue-800 transition"
                            title="Edit"
                          >
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                          </button>

                          {/* Publish Button (for drafts) */}
                          {post.status === "draft" && (
                            <button
                              onClick={() => handlePublishPost(post.uid)}
                              className="text-green-600 hover:text-green-800 transition"
                              title="Publish"
                            >
                              <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            </button>
                          )}

                          {/* Archive Button (for published/scheduled) */}
                          {(post.status === "published" ||
                            post.status === "scheduled") && (
                            <button
                              onClick={() => openArchiveModal(post)}
                              className="text-yellow-600 hover:text-yellow-800 transition"
                              title="Archive"
                            >
                              <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                                />
                              </svg>
                            </button>
                          )}

                          {/* Delete Button (for drafts only) */}
                          {post.status === "draft" && (
                            <button
                              onClick={() => openDeleteModal(post)}
                              className="text-red-600 hover:text-red-800 transition"
                              title="Delete"
                            >
                              <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-2 sm:space-y-3">
              {filteredPosts.map((post) => (
                <div
                  key={post.uid}
                  className="bg-white border border-gray-200 rounded-lg p-3 space-y-2 sm:space-y-3 hover:border-red-300 transition"
                >
                  {/* Title and Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">{post.title}</h3>
                      {post.attachments && post.attachments.length > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          {post.attachments.length} attachment(s)
                        </p>
                      )}
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0 ${getStatusBadgeColor(
                        post.status
                      )}`}
                    >
                      {post.status.charAt(0).toUpperCase() + post.status.slice(1)}
                    </span>
                  </div>

                  {/* Author and Date */}
                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <span>By {post.author_name}</span>
                    <span>
                      {post.status === "scheduled"
                        ? `Scheduled: ${formatDate(post.scheduled_for)}`
                        : formatDate(post.publish_at)}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                    <button
                      onClick={() => handleEdit(post)}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      <span>Edit</span>
                    </button>
                    {post.status === "draft" && (
                      <button
                        onClick={() => handlePublishPost(post.uid)}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Publish</span>
                      </button>
                    )}
                    {(post.status === "published" || post.status === "scheduled") && (
                      <button
                        onClick={() => openArchiveModal(post)}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm text-yellow-600 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                        </svg>
                        <span>Archive</span>
                      </button>
                    )}
                    <button
                      onClick={() => openDeleteModal(post)}
                      className="flex items-center justify-center gap-1 px-3 py-2 text-sm text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full">
            <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4">
              Delete Post
            </h3>
            <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
              Are you sure you want to delete &quot;{postToDelete?.title}&quot;? This
              action cannot be undone.
            </p>
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3">
              <button
                onClick={() => {
                  setDeleteModalOpen(false);
                  setPostToDelete(null);
                }}
                className="px-4 py-2 text-sm sm:text-base border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDeletePost}
                className="px-4 py-2 text-sm sm:text-base bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Archive Confirmation Modal */}
      {archiveModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full">
            <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4">
              Archive Post
            </h3>
            <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
              Are you sure you want to archive &quot;{postToArchive?.title}&quot;? You
              can restore it later from the archived section.
            </p>
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3">
              <button
                onClick={() => {
                  setArchiveModalOpen(false);
                  setPostToArchive(null);
                }}
                className="px-4 py-2 text-sm sm:text-base border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleArchivePost}
                className="px-4 py-2 text-sm sm:text-base bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition"
              >
                Archive
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
