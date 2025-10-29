import { getAuth } from "firebase/auth";
import { API_BASE } from "../config/config";

/**
 * Notification Service
 * Handles all notification-related API calls
 */

/**
 * Get all notifications for the current user
 * @param {Object} options - Query options
 * @param {number} options.limit - Number of notifications to fetch
 * @param {number} options.offset - Pagination offset
 * @param {boolean} options.unreadOnly - Fetch only unread notifications
 * @returns {Promise<Object>} Notification data
 */
export async function getNotifications({
  limit = 20,
  offset = 0,
  unreadOnly = false,
} = {}) {
  try {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      throw new Error("User not authenticated");
    }

    const token = await user.getIdToken();
    const queryParams = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
      unread_only: unreadOnly.toString(),
    });

    const response = await fetch(`${API_BASE}/notifications?${queryParams}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ error: "Unknown error" }));
      throw new Error(
        errorData.error || `Failed to fetch notifications: ${response.status}`
      );
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error("Error fetching notifications:", error);
    throw error;
  }
}

/**
 * Get count of unread notifications
 * @returns {Promise<number>} Unread notification count
 */
export async function getUnreadCount() {
  try {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      throw new Error("User not authenticated");
    }

    const token = await user.getIdToken();

    const response = await fetch(`${API_BASE}/notifications/unread-count`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch unread count");
    }

    const result = await response.json();
    return result.data.unread_count;
  } catch (error) {
    console.error("Error fetching unread count:", error);
    throw error;
  }
}

/**
 * Mark a notification as read
 * @param {number} notificationId - ID of the notification
 * @returns {Promise<Object>} Updated notification data
 */
export async function markAsRead(notificationId) {
  try {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      throw new Error("User not authenticated");
    }

    const token = await user.getIdToken();

    const response = await fetch(
      `${API_BASE}/notifications/${notificationId}/read`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to mark notification as read");
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error("Error marking notification as read:", error);
    throw error;
  }
}

/**
 * Mark all notifications as read
 * @returns {Promise<Object>} Result data
 */
export async function markAllAsRead() {
  try {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      throw new Error("User not authenticated");
    }

    const token = await user.getIdToken();

    const response = await fetch(`${API_BASE}/notifications/mark-all-read`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Failed to mark all notifications as read");
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    throw error;
  }
}

/**
 * Delete a notification
 * @param {number} notificationId - ID of the notification
 * @returns {Promise<Object>} Result data
 */
export async function deleteNotification(notificationId) {
  try {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      throw new Error("User not authenticated");
    }

    const token = await user.getIdToken();

    const response = await fetch(
      `${API_BASE}/notifications/${notificationId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to delete notification");
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error("Error deleting notification:", error);
    throw error;
  }
}

/**
 * Create a new notification (Admin only)
 * @param {Object} notificationData - Notification data
 * @returns {Promise<Object>} Created notification data
 */
export async function createNotification(notificationData) {
  try {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      throw new Error("User not authenticated");
    }

    const token = await user.getIdToken();

    const response = await fetch(`${API_BASE}/notifications`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(notificationData),
    });

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ error: "Unknown error" }));
      throw new Error(errorData.error || "Failed to create notification");
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error("Error creating notification:", error);
    throw error;
  }
}
