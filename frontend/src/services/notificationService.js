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
      console.error(`[NotificationService] Failed to fetch notifications:`, {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
        url: `${API_BASE}/notifications?${queryParams}`
      });
      throw new Error(
        errorData.error || `Failed to fetch notifications: ${response.status}`
      );
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error("[NotificationService] Error fetching notifications:", {
      message: error.message,
      name: error.name,
      stack: error.stack,
      apiBase: API_BASE
    });
    
    // Provide more helpful error message
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Unable to connect to server. Please check if the backend is running.');
    }
    
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
      const errorData = await response
        .json()
        .catch(() => ({ error: "Unknown error" }));
      console.error("Delete notification failed:", {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
      });
      throw new Error(
        errorData.error || `Failed to delete notification: ${response.status}`
      );
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error("Error deleting notification:", error);
    throw error;
  }
}

/**
 * Delete all read notifications
 * @returns {Promise<Object>} Result data with deleted count
 */
export async function deleteAllReadNotifications() {
  try {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      throw new Error("User not authenticated");
    }

    const token = await user.getIdToken();

    const response = await fetch(`${API_BASE}/notifications/all-read`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ error: "Unknown error" }));
      console.error("Delete all read notifications failed:", {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
      });
      throw new Error(
        errorData.error || `Failed to delete all read notifications: ${response.status}`
      );
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error("Error deleting all read notifications:", error);
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

// ============================================
// PUSH NOTIFICATION FUNCTIONS (FCM)
// ============================================

/**
 * Subscribe to push notifications using FCM
 * @returns {Promise<string>} FCM token
 */
export async function subscribeToFCM() {
  // Check if browser supports notifications
  if (!("Notification" in window)) {
    throw new Error("This browser does not support notifications");
  }

  if (!("serviceWorker" in navigator)) {
    throw new Error("This browser does not support service workers");
  }

  // Request permission
  const permission = await Notification.requestPermission();
  
  if (permission !== "granted") {
    throw new Error("Notification permission denied");
  }

  // TODO: Implement FCM token retrieval and backend registration
  // This is a placeholder that simulates the flow
  console.log("[NotificationService] Permission granted, FCM integration pending");
  
  // In production, this would:
  // 1. Register service worker
  // 2. Get FCM token using messaging.getToken()
  // 3. POST token to backend /api/notifications/subscribe
  
  // Return mock token for now
  return "mock-fcm-token-" + Date.now();
}

/**
 * Unsubscribe from push notifications
 * @returns {Promise<void>}
 */
export async function unsubscribeFromFCM() {
  // TODO: Implement FCM token deletion and backend unregistration
  // This would:
  // 1. Get current token
  // 2. POST to backend /api/notifications/unsubscribe
  // 3. Delete token via messaging.deleteToken()
  
  console.log("[NotificationService] Unsubscribe called, FCM integration pending");
  return Promise.resolve();
}

/**
 * Check if push notifications are supported
 * @returns {boolean}
 */
export function isPushSupported() {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

/**
 * Get current notification permission status
 * @returns {NotificationPermission | null}
 */
export function getNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return null;
  }
  return Notification.permission;
}
