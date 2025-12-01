const express = require("express");
const router = express.Router();
const userSettingsRepository = require("../repositories/userSettingsRepository");
const userRepository = require("../repositories/userRepository");

/**
 * @route   GET /api/users/:uid/settings
 * @desc    Get user settings
 * @access  Private (Own profile or admin)
 */
router.get("/:uid/settings", async (req, res) => {
  try {
    const { uid } = req.params;

    // Get user by Firebase UID
    const user = await userRepository.getByUid(uid);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Get settings
    let settings = await userSettingsRepository.getUserSettings(user.id);

    // Return defaults if no settings exist
    if (!settings) {
      settings = {
        theme: "system",
        push_notifications_enabled: false,
        fcm_token: null,
        email_notifications_enabled: true,
        language: "en",
        timezone: "UTC",
      };
    }

    res.json({
      success: true,
      data: {
        settings: {
          theme: settings.theme,
          pushNotificationsEnabled: settings.push_notifications_enabled,
          emailNotificationsEnabled: settings.email_notifications_enabled,
          language: settings.language,
          timezone: settings.timezone,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching user settings:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch settings",
    });
  }
});

/**
 * @route   PUT /api/users/:uid/settings
 * @desc    Update user settings
 * @access  Private (Own profile only)
 */
router.put("/:uid/settings", async (req, res) => {
  try {
    const { uid } = req.params;
    const { theme, pushNotificationsEnabled, emailNotificationsEnabled, language, timezone } =
      req.body;

    // Get user by Firebase UID
    const user = await userRepository.getByUid(uid);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Build settings object
    const settingsUpdate = {};
    if (theme !== undefined) settingsUpdate.theme = theme;
    if (pushNotificationsEnabled !== undefined)
      settingsUpdate.push_notifications_enabled = pushNotificationsEnabled;
    if (emailNotificationsEnabled !== undefined)
      settingsUpdate.email_notifications_enabled = emailNotificationsEnabled;
    if (language !== undefined) settingsUpdate.language = language;
    if (timezone !== undefined) settingsUpdate.timezone = timezone;

    // Upsert settings
    const updatedSettings = await userSettingsRepository.upsertUserSettings(
      user.id,
      settingsUpdate
    );

    res.json({
      success: true,
      message: "Settings updated successfully",
      data: {
        settings: {
          theme: updatedSettings.theme,
          pushNotificationsEnabled: updatedSettings.push_notifications_enabled,
          emailNotificationsEnabled: updatedSettings.email_notifications_enabled,
          language: updatedSettings.language,
          timezone: updatedSettings.timezone,
        },
      },
    });
  } catch (error) {
    console.error("Error updating user settings:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update settings",
    });
  }
});

/**
 * @route   POST /api/users/:uid/settings/fcm-token
 * @desc    Save FCM token for push notifications
 * @access  Private (Own profile only)
 */
router.post("/:uid/settings/fcm-token", async (req, res) => {
  try {
    const { uid } = req.params;
    const { fcmToken } = req.body;

    if (!fcmToken || typeof fcmToken !== "string") {
      return res.status(400).json({
        success: false,
        message: "Valid FCM token is required",
      });
    }

    // Get user by Firebase UID
    const user = await userRepository.getByUid(uid);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Save FCM token
    const updatedSettings = await userSettingsRepository.saveFcmToken(
      user.id,
      fcmToken
    );

    res.json({
      success: true,
      message: "FCM token saved successfully",
      data: {
        pushNotificationsEnabled: updatedSettings.push_notifications_enabled,
      },
    });
  } catch (error) {
    console.error("Error saving FCM token:", error);
    res.status(500).json({
      success: false,
      message: "Failed to save FCM token",
    });
  }
});

/**
 * @route   DELETE /api/users/:uid/settings/fcm-token
 * @desc    Remove FCM token (disable push notifications)
 * @access  Private (Own profile only)
 */
router.delete("/:uid/settings/fcm-token", async (req, res) => {
  try {
    const { uid } = req.params;

    // Get user by Firebase UID
    const user = await userRepository.getByUid(uid);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Remove FCM token
    await userSettingsRepository.removeFcmToken(user.id);

    res.json({
      success: true,
      message: "FCM token removed successfully",
    });
  } catch (error) {
    console.error("Error removing FCM token:", error);
    res.status(500).json({
      success: false,
      message: "Failed to remove FCM token",
    });
  }
});

module.exports = router;
