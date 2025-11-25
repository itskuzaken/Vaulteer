"use client";

import React, { useState, useEffect, useRef } from "react";
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
} from "react-icons/io5";
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from "../../services/notificationService";

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

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const pollingIntervalRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      // Lock body scroll on mobile when dropdown is open
      if (window.innerWidth < 640) {
        document.body.style.overflow = "hidden";
      }
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      // Restore body scroll
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Fetch notifications and unread count
  const fetchData = async () => {
    try {
      const [notifData, count] = await Promise.all([
        getNotifications({ limit: 10, offset: 0 }),
        getUnreadCount(),
      ]);

      setNotifications(notifData.notifications || []);
      setUnreadCount(count);
    } catch (error) {
      console.error("Error fetching notification data:", error);
    }
  };

  // Initial fetch and polling setup
  useEffect(() => {
    fetchData();

    // Poll every 30 seconds
    pollingIntervalRef.current = setInterval(() => {
      fetchData();
    }, 30000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // Handle notification click (mark as read)
  const handleNotificationClick = async (notification) => {
    if (!notification.is_read) {
      try {
        await markAsRead(notification.notification_id);
        await fetchData(); // Refresh data
      } catch (error) {
        console.error("Error marking notification as read:", error);
      }
    }

    // If there's an action URL, navigate to it
    if (notification.action_url) {
      window.location.href = notification.action_url;
    }
  };

  // Handle mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      setLoading(true);
      await markAllAsRead();
      await fetchData();
    } catch (error) {
      console.error("Error marking all as read:", error);
    } finally {
      setLoading(false);
    }
  };

  // Handle delete notification
  const handleDelete = async (notificationId, event) => {
    event.stopPropagation(); // Prevent triggering notification click
    try {
      await deleteNotification(notificationId);
      await fetchData();
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 hover:scale-110 active:scale-95"
        aria-label="Notifications"
      >
        <IoNotificationsOutline className="w-6 h-6 text-gray-700 dark:text-gray-300 transition-transform duration-200" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-600 rounded-full animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <div className="fixed sm:absolute right-0 sm:right-0 left-0 sm:left-auto top-0 sm:top-auto sm:mt-2 w-full sm:w-96 md:w-[28rem] bg-white dark:bg-gray-900 sm:rounded-lg shadow-xl border-t sm:border border-gray-200 dark:border-gray-700 z-50 h-full sm:h-auto sm:max-h-[600px] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="px-4 py-4 sm:py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between sticky sm:static top-0 bg-white dark:bg-gray-900 z-10">
            <h3 className="text-lg sm:text-lg font-semibold text-gray-900 dark:text-white">
              Notifications
            </h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  disabled={loading}
                  className="flex items-center gap-1 text-xs sm:text-sm text-red-600 hover:text-red-700 dark:text-red-500 dark:hover:text-red-400 transition-colors disabled:opacity-50"
                >
                  <IoCheckmarkDone className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Mark all read</span>
                  <span className="sm:hidden">Read all</span>
                </button>
              )}
              {/* Close button for mobile */}
              <button
                onClick={() => setIsOpen(false)}
                className="sm:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                aria-label="Close notifications"
              >
                <svg
                  className="w-5 h-5 text-gray-500 dark:text-gray-400"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
          </div>

          {/* Notification List */}
          <div className="overflow-y-auto flex-1 overscroll-contain">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 sm:py-12 px-4 text-center min-h-[300px] sm:min-h-0">
                <IoNotificationsOutline className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-base sm:text-base text-gray-500 dark:text-gray-400 font-medium">
                  No notifications yet
                </p>
                <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-500 mt-1">
                  We&apos;ll notify you when something new arrives
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {notifications.map((notification) => (
                  <div
                    key={notification.notification_id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`
                      px-3 sm:px-4 py-3 sm:py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer active:bg-gray-100 dark:active:bg-gray-700
                      ${
                        !notification.is_read
                          ? "bg-blue-50 dark:bg-blue-950/20"
                          : ""
                      }
                    `}
                  >
                    <div className="flex items-start gap-2 sm:gap-3">
                      {/* Icon */}
                      <div className="flex-shrink-0 mt-0.5">
                        <div className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center">
                          {getNotificationIcon(notification.type)}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4
                            className={`text-sm sm:text-sm font-medium text-gray-900 dark:text-white ${
                              !notification.is_read ? "font-semibold" : ""
                            }`}
                          >
                            {notification.title}
                          </h4>
                          <button
                            onClick={(e) =>
                              handleDelete(notification.notification_id, e)
                            }
                            className="flex-shrink-0 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors touch-manipulation"
                            aria-label="Delete notification"
                          >
                            <IoTrashOutline className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 hover:text-red-500" />
                          </button>
                        </div>
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500 mt-1">
                          {timeAgo(notification.created_at)}
                        </p>
                      </div>

                      {/* Unread indicator */}
                      {!notification.is_read && (
                        <div className="flex-shrink-0 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-red-600 rounded-full mt-2"></div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 sticky sm:static bottom-0 bg-white dark:bg-gray-900">
              <button
                onClick={() => {
                  setIsOpen(false);
                  // TODO: Navigate to full notifications page
                  // window.location.href = '/notifications';
                }}
                className="w-full text-center text-xs sm:text-sm text-red-600 hover:text-red-700 dark:text-red-500 dark:hover:text-red-400 font-medium transition-colors py-1 sm:py-0"
              >
                View All Notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
