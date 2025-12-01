"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  IoNotificationsOutline,
  IoCheckmarkCircle,
  IoAlertCircle,
  IoInformationCircle,
  IoWarning,
  IoChatbubbleEllipses,
  IoCheckboxOutline,
  IoSettingsOutline,
  IoTrashOutline,
  IoCheckmarkDone,
  IoChevronBackOutline,
  IoChevronForwardOutline,
} from "react-icons/io5";
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllReadNotifications,
} from "../../services/notificationService";
import { buildEventDetailPath, buildPostDetailPath } from "@/utils/dashboardRouteHelpers";
import ConfirmationModal from "./ConfirmationModal";
import NotificationMessage from "./NotificationMessage";

/**
 * Get icon component based on notification type
 */
const getNotificationIcon = (type) => {
  const iconMap = {
    success: <IoCheckmarkCircle className="text-green-500" />,
    alert: <IoAlertCircle className="text-red-500" />,
    warning: <IoWarning className="text-yellow-500" />,
    info: <IoInformationCircle className="text-blue-500" />,
    message: <IoChatbubbleEllipses className="text-purple-500" />,
    task: <IoCheckboxOutline className="text-indigo-500" />,
    system: <IoSettingsOutline className="text-gray-500" />,
  };
  return iconMap[type] || <IoInformationCircle className="text-gray-500" />;
};

/**
 * Format timestamp to relative time
 */
const timeAgo = (timestamp) => {
  const now = new Date();
  const date = new Date(timestamp);
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} mins ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 172800) return "Yesterday";
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
  return date.toLocaleDateString();
};

export default function NotificationsPage({ currentUser }) {
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, unread
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const bulkActionsRef = useRef(null);
  const limit = 20;

  // Close bulk actions dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (bulkActionsRef.current && !bulkActionsRef.current.contains(event.target)) {
        setShowBulkActions(false);
      }
    };

    if (showBulkActions) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showBulkActions]);

  // Fetch notifications
  const fetchNotifications = async (currentPage = 1, currentFilter = "all") => {
    try {
      setLoading(true);
      const offset = (currentPage - 1) * limit;
      const unreadOnly = currentFilter === "unread";

      const [notifData, count] = await Promise.all([
        getNotifications({ limit, offset, unreadOnly }),
        getUnreadCount(),
      ]);

      setNotifications(notifData.notifications || []);
      setUnreadCount(count);
      setHasMore((notifData.notifications || []).length === limit);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchNotifications(page, filter);
  }, [page, filter]);

  // Handle notification click
  const handleNotificationClick = async (notification) => {
    if (!notification.is_read) {
      try {
        await markAsRead(notification.notification_id);
        await fetchNotifications(page, filter);
      } catch (error) {
        console.error("Error marking notification as read:", error);
      }
    }

    // Navigate to action URL
    if (notification.action_url && currentUser) {
      const userRole = currentUser.role?.toLowerCase() || "volunteer";
      let targetUrl = notification.action_url;

      // Check if it's an event notification
      const eventUidMatch = notification.action_url.match(/eventUid=([a-zA-Z0-9-]+)/);
      if (eventUidMatch) {
        const eventUid = eventUidMatch[1];
        targetUrl = buildEventDetailPath(userRole, eventUid);
      }
      // Check if it's a post notification
      else {
        const postUidMatch = notification.action_url.match(/postUid=([a-zA-Z0-9-]+)/);
        if (postUidMatch) {
          const postUid = postUidMatch[1];
          targetUrl = buildPostDetailPath(userRole, postUid);
        }
      }

      router.push(targetUrl);
    }
  };

  // Handle mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      setLoading(true);
      await markAllAsRead();
      await fetchNotifications(page, filter);
      setShowBulkActions(false);
    } catch (error) {
      console.error("Error marking all as read:", error);
    } finally {
      setLoading(false);
    }
  };

  // Handle delete all read notifications
  const handleDeleteAllRead = async () => {
    setIsDeleting(true);
    try {
      await deleteAllReadNotifications();
      await fetchNotifications(page, filter);
      setShowBulkActions(false);
      setShowDeleteAllModal(false);
    } catch (error) {
      console.error("Error deleting all read notifications:", error);
      alert("Failed to delete notifications. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle delete notification
  const handleDelete = async (notificationId, event) => {
    event.stopPropagation();
    try {
      await deleteNotification(notificationId);
      await fetchNotifications(page, filter);
    } catch (error) {
      console.error("Error deleting notification:", error);
      alert("Failed to delete notification. Please try again.");
    }
  };

  // Handle filter change
  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    setPage(1);
  };

  // Handle page change
  const handlePreviousPage = () => {
    if (page > 1) {
      setPage(page - 1);
    }
  };

  const handleNextPage = () => {
    if (hasMore) {
      setPage(page + 1);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6 mb-4 sm:mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <IoNotificationsOutline className="w-6 h-6 sm:w-8 sm:h-8 text-red-600" />
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
              Notifications
            </h1>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                disabled={loading}
                className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base touch-manipulation"
              >
                <IoCheckmarkDone className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Mark all as read</span>
                <span className="sm:hidden">Mark all</span>
              </button>
            )}
            <div className="relative" ref={bulkActionsRef}>
              <button
                onClick={() => setShowBulkActions(!showBulkActions)}
                className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm sm:text-base touch-manipulation"
                aria-label="More actions"
              >
                <IoSettingsOutline className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Actions</span>
              </button>
              
              {/* Bulk Actions Dropdown */}
              {showBulkActions && (
                <div className="absolute right-0 mt-2 w-64 sm:w-56 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-10">
                  <div className="py-2">
                    <button
                      onClick={handleMarkAllAsRead}
                      disabled={loading || unreadCount === 0}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm sm:text-base text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                    >
                      <IoCheckmarkDone className="w-5 h-5 text-green-600 flex-shrink-0" />
                      <div>
                        <div className="font-medium">Mark all as read</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Clear all unread notifications
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={() => setShowDeleteAllModal(true)}
                      disabled={loading}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm sm:text-base text-gray-700 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                    >
                      <IoTrashOutline className="w-5 h-5 text-red-600 flex-shrink-0" />
                      <div>
                        <div className="font-medium">Delete all read</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Remove all read notifications
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => handleFilterChange("all")}
            className={`px-3 sm:px-4 py-2 rounded-lg font-medium text-sm sm:text-base transition-colors touch-manipulation ${
              filter === "all"
                ? "bg-red-600 text-white"
                : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
            }`}
          >
            All
            {filter === "all" && notifications.length > 0 && (
              <span className="ml-1.5 sm:ml-2 text-xs opacity-90">({notifications.length})</span>
            )}
          </button>
          <button
            onClick={() => handleFilterChange("unread")}
            className={`px-3 sm:px-4 py-2 rounded-lg font-medium text-sm sm:text-base transition-colors touch-manipulation ${
              filter === "unread"
                ? "bg-red-600 text-white"
                : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
            }`}
          >
            Unread
            {unreadCount > 0 && (
              <span className="ml-1.5 sm:ml-2 text-xs opacity-90">({unreadCount})</span>
            )}
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 sm:py-16 px-4 text-center">
            <IoNotificationsOutline className="w-16 h-16 sm:w-20 sm:h-20 text-gray-300 dark:text-gray-600 mb-3 sm:mb-4" />
            <p className="text-lg sm:text-xl text-gray-500 dark:text-gray-400 font-medium">
              {filter === "unread" ? "No unread notifications" : "No notifications yet"}
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
              {filter === "unread"
                ? "You're all caught up!"
                : "We'll notify you when something new arrives"}
            </p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {notifications.map((notification) => (
                <div
                  key={notification.notification_id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-3 sm:p-4 hover:bg-gray-50 dark:hover:bg-gray-700 active:bg-gray-100 dark:active:bg-gray-600 transition-colors cursor-pointer touch-manipulation ${
                    !notification.is_read
                      ? "bg-blue-50 dark:bg-blue-950/20 border-l-4 border-red-600"
                      : ""
                  }`}
                >
                  <div className="flex items-start gap-2 sm:gap-4">
                    {/* Icon */}
                    <div className="flex-shrink-0 mt-0.5 sm:mt-1">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center">
                        {getNotificationIcon(notification.type)}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <h3
                            className={`text-sm sm:text-base font-medium text-gray-900 dark:text-white ${
                              !notification.is_read ? "font-bold" : ""
                            }`}
                          >
                            {notification.title}
                          </h3>
                          <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-3 sm:line-clamp-none">
                            <NotificationMessage message={notification.message} />
                          </div>
                          <p className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500 mt-1.5 sm:mt-2">
                            {timeAgo(notification.created_at)}
                          </p>
                        </div>
                        <button
                          onClick={(e) => handleDelete(notification.notification_id, e)}
                          className="flex-shrink-0 p-1.5 sm:p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors touch-manipulation"
                          aria-label="Delete notification"
                        >
                          <IoTrashOutline className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 hover:text-red-500" />
                        </button>
                      </div>
                    </div>

                    {/* Unread indicator */}
                    {!notification.is_read && (
                      <div className="flex-shrink-0 w-2 h-2 sm:w-3 sm:h-3 bg-red-600 rounded-full mt-1.5 sm:mt-2"></div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="bg-gray-50 dark:bg-gray-900 px-3 sm:px-4 py-3 sm:py-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={handlePreviousPage}
                  disabled={page === 1}
                  className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-manipulation"
                >
                  <IoChevronBackOutline className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden xs:inline">Previous</span>
                  <span className="xs:hidden">Prev</span>
                </button>
                <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-medium">
                  Page {page}
                </span>
                <button
                  onClick={handleNextPage}
                  disabled={!hasMore}
                  className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-manipulation"
                >
                  Next
                  <IoChevronForwardOutline className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Delete All Read Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteAllModal}
        onClose={() => setShowDeleteAllModal(false)}
        onConfirm={handleDeleteAllRead}
        title="Delete All Read Notifications"
        message="Are you sure you want to delete all read notifications? This action cannot be undone."
        confirmText="Delete All"
        cancelText="Cancel"
        confirmButtonClass="bg-red-600 hover:bg-red-700 text-white"
        loading={isDeleting}
      />
    </div>
  );
}
