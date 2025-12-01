import { auth } from "./firebase";
import { API_BASE } from "../config/config";

/**
 * User Settings Service
 * Handles user preferences and notification settings
 */

/**
 * Get auth headers with Firebase ID token
 */
async function getAuthHeaders() {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("User not authenticated");
  }

  const idToken = await user.getIdToken();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${idToken}`,
  };
}

/**
 * Get user settings
 * @param {string} uid - Firebase user UID
 * @returns {Promise<Object>} User settings
 */
export async function getUserSettings(uid) {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE}/users/${uid}/settings`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch settings: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data.settings;
  } catch (error) {
    console.error("Error fetching user settings:", error);
    throw error;
  }
}

/**
 * Update user settings
 * @param {string} uid - Firebase user UID
 * @param {Object} settings - Settings to update
 * @returns {Promise<Object>} Updated settings
 */
export async function updateUserSettings(uid, settings) {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE}/users/${uid}/settings`, {
      method: "PUT",
      headers,
      body: JSON.stringify(settings),
    });

    if (!response.ok) {
      throw new Error(`Failed to update settings: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data.settings;
  } catch (error) {
    console.error("Error updating user settings:", error);
    throw error;
  }
}

/**
 * Save FCM token for push notifications
 * @param {string} uid - Firebase user UID
 * @param {string} fcmToken - FCM device token
 * @returns {Promise<Object>} Success response
 */
export async function saveFcmToken(uid, fcmToken) {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE}/users/${uid}/settings/fcm-token`, {
      method: "POST",
      headers,
      body: JSON.stringify({ fcmToken }),
    });

    if (!response.ok) {
      throw new Error(`Failed to save FCM token: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error saving FCM token:", error);
    throw error;
  }
}

/**
 * Remove FCM token (disable push notifications)
 * @param {string} uid - Firebase user UID
 * @returns {Promise<Object>} Success response
 */
export async function removeFcmToken(uid) {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE}/users/${uid}/settings/fcm-token`, {
      method: "DELETE",
      headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to remove FCM token: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error removing FCM token:", error);
    throw error;
  }
}
