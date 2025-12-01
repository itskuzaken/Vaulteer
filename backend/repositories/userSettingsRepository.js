const { getPool } = require("../db/pool");

/**
 * User Settings Repository
 * Manages user preferences and notification settings
 */

/**
 * Get user settings by user ID
 * @param {number} userId - User ID
 * @returns {Promise<Object|null>} User settings object or null
 */
async function getUserSettings(userId) {
  try {
    const [rows] = await getPool().query(
      `SELECT 
        setting_id,
        user_id,
        theme,
        push_notifications_enabled,
        fcm_token,
        email_notifications_enabled,
        language,
        timezone,
        created_at,
        updated_at
      FROM user_settings
      WHERE user_id = ?`,
      [userId]
    );

    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error("Error fetching user settings:", error);
    throw error;
  }
}

/**
 * Update user settings
 * @param {number} userId - User ID
 * @param {Object} settings - Settings to update
 * @returns {Promise<Object>} Updated settings
 */
async function updateUserSettings(userId, settings) {
  try {
    const allowedFields = [
      "theme",
      "push_notifications_enabled",
      "email_notifications_enabled",
      "language",
      "timezone",
    ];

    const updates = [];
    const values = [];

    allowedFields.forEach((field) => {
      if (settings.hasOwnProperty(field)) {
        updates.push(`${field} = ?`);
        values.push(settings[field]);
      }
    });

    if (updates.length === 0) {
      throw new Error("No valid fields to update");
    }

    values.push(userId);

    await getPool().query(
      `UPDATE user_settings SET ${updates.join(", ")} WHERE user_id = ?`,
      values
    );

    return await getUserSettings(userId);
  } catch (error) {
    console.error("Error updating user settings:", error);
    throw error;
  }
}

/**
 * Create or update user settings (upsert)
 * @param {number} userId - User ID
 * @param {Object} settings - Settings to create/update
 * @returns {Promise<Object>} Settings object
 */
async function upsertUserSettings(userId, settings) {
  try {
    const existing = await getUserSettings(userId);

    if (existing) {
      return await updateUserSettings(userId, settings);
    }

    // Create new settings
    const {
      theme = "system",
      push_notifications_enabled = false,
      email_notifications_enabled = true,
      language = "en",
      timezone = "UTC",
    } = settings;

    await getPool().query(
      `INSERT INTO user_settings 
        (user_id, theme, push_notifications_enabled, email_notifications_enabled, language, timezone)
      VALUES (?, ?, ?, ?, ?, ?)`,
      [
        userId,
        theme,
        push_notifications_enabled,
        email_notifications_enabled,
        language,
        timezone,
      ]
    );

    return await getUserSettings(userId);
  } catch (error) {
    console.error("Error upserting user settings:", error);
    throw error;
  }
}

/**
 * Save FCM token for push notifications
 * @param {number} userId - User ID
 * @param {string} fcmToken - Firebase Cloud Messaging token
 * @returns {Promise<Object>} Updated settings
 */
async function saveFcmToken(userId, fcmToken) {
  try {
    // Ensure settings exist first
    let settings = await getUserSettings(userId);
    if (!settings) {
      settings = await initializeDefaultSettings(userId);
    }

    await getPool().query(
      `UPDATE user_settings 
      SET fcm_token = ?, push_notifications_enabled = TRUE 
      WHERE user_id = ?`,
      [fcmToken, userId]
    );

    return await getUserSettings(userId);
  } catch (error) {
    console.error("Error saving FCM token:", error);
    throw error;
  }
}

/**
 * Remove FCM token (invalid/expired token)
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Updated settings
 */
async function removeFcmToken(userId) {
  try {
    await getPool().query(
      `UPDATE user_settings 
      SET fcm_token = NULL, push_notifications_enabled = FALSE 
      WHERE user_id = ?`,
      [userId]
    );

    return await getUserSettings(userId);
  } catch (error) {
    console.error("Error removing FCM token:", error);
    throw error;
  }
}

/**
 * Get all users with push notifications enabled and valid FCM tokens
 * @returns {Promise<Array>} Array of user objects with FCM tokens
 */
async function getUsersWithPushEnabled() {
  try {
    const [rows] = await getPool().query(
      `SELECT 
        us.user_id,
        us.fcm_token,
        us.theme,
        us.language,
        u.name,
        u.email
      FROM user_settings us
      JOIN users u ON us.user_id = u.user_id
      WHERE us.push_notifications_enabled = TRUE 
        AND us.fcm_token IS NOT NULL
        AND u.status = 'active'`
    );

    return rows;
  } catch (error) {
    console.error("Error fetching users with push enabled:", error);
    throw error;
  }
}

/**
 * Initialize default settings for a new user
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Created settings
 */
async function initializeDefaultSettings(userId) {
  try {
    await getPool().query(
      `INSERT INTO user_settings 
        (user_id, theme, push_notifications_enabled, email_notifications_enabled, language, timezone)
      VALUES (?, 'system', FALSE, TRUE, 'en', 'UTC')
      ON DUPLICATE KEY UPDATE user_id = user_id`,
      [userId]
    );

    return await getUserSettings(userId);
  } catch (error) {
    console.error("Error initializing default settings:", error);
    throw error;
  }
}

/**
 * Remove FCM token by token value (for cleanup when token is invalid)
 * @param {string} fcmToken - FCM token to remove
 * @returns {Promise<void>}
 */
async function removeFcmTokenByValue(fcmToken) {
  try {
    await getPool().query(
      `UPDATE user_settings 
      SET fcm_token = NULL, push_notifications_enabled = FALSE 
      WHERE fcm_token = ?`,
      [fcmToken]
    );
  } catch (error) {
    console.error("Error removing FCM token by value:", error);
    throw error;
  }
}

/**
 * Get all users with email notifications enabled
 * @returns {Promise<Array>} Array of user objects with email addresses
 */
async function getUsersWithEmailEnabled() {
  try {
    const [rows] = await getPool().query(
      `SELECT 
        us.user_id,
        us.language,
        u.name,
        u.email
      FROM user_settings us
      JOIN users u ON us.user_id = u.user_id
      WHERE us.email_notifications_enabled = TRUE 
        AND u.email IS NOT NULL
        AND u.status = 'active'`
    );

    return rows;
  } catch (error) {
    console.error("Error fetching users with email enabled:", error);
    throw error;
  }
}

module.exports = {
  getUserSettings,
  updateUserSettings,
  upsertUserSettings,
  saveFcmToken,
  removeFcmToken,
  getUsersWithPushEnabled,
  getUsersWithEmailEnabled,
  initializeDefaultSettings,
  removeFcmTokenByValue,
};
