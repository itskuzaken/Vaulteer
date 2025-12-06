const { getPool } = require("../db/pool");
const admin = require("firebase-admin");
const userRepository = require("../repositories/userRepository");
const userSettingsRepository = require("../repositories/userSettingsRepository");
const emailService = require("./emailService");

// Initialize Firebase Admin SDK (singleton pattern)
let firebaseInitialized = false;

function initializeFirebase() {
  if (!firebaseInitialized) {
    try {
      if (!admin.apps.length) {
        const serviceAccount = require("../firebase-service-account.json");
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        console.log("Firebase Admin SDK initialized successfully");
      }
      firebaseInitialized = true;
    } catch (error) {
      console.error("Failed to initialize Firebase Admin SDK:", error);
      firebaseInitialized = false;
    }
  }
  return firebaseInitialized;
}

function toJson(metadata) {
  if (!metadata) {
    return null;
  }
  try {
    return JSON.stringify(metadata);
  } catch (error) {
    console.warn("Unable to serialize notification metadata", error);
    return null;
  }
}

async function createNotification({
  userId,
  title,
  message,
  type = "info",
  actionUrl = null,
  metadata = null,
}) {
  if (!userId) {
    throw new Error("createNotification requires a userId");
  }

  const pool = getPool();
  const [result] = await pool.query(
    `INSERT INTO notifications (user_id, title, message, type, action_url, metadata)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, title || "", message || "", type, actionUrl, toJson(metadata)]
  );

  return { notificationId: result.insertId };
}

const ACTION_LABELS = {
  EVENT_REGISTER: "event registration",
  WAITLIST_JOIN: "waitlist registration",
  WAITLIST_PROMOTION: "waitlist promotion",
  EVENT_ATTEND: "event attendance",
  EVENT_CANCEL: "event cancellation",
  EVENT_HOST_PUBLISHED: "event publishing",
  STREAK_DAY: "streak bonus",
  BADGE_BONUS: "badge bonus",
};

function formatActionLabel(action) {
  return (
    ACTION_LABELS[action] ||
    action?.toLowerCase()?.replace(/_/g, " ") ||
    "gamification"
  );
}

async function notifyGamificationPoints({
  userId,
  action,
  pointsDelta,
  metadata = {},
}) {
  if (!userId || !pointsDelta) {
    return null;
  }

  const positive = pointsDelta >= 0;
  const descriptor = formatActionLabel(action);
  const eventTitle = metadata.eventTitle;
  const prefix = positive ? "+" : "";
  const title = `${prefix}${pointsDelta} pts ${
    positive ? "earned" : "adjusted"
  }`;
  const baseMessage = positive
    ? `You earned ${prefix}${pointsDelta} pts from ${descriptor}.`
    : `Your total was adjusted by ${pointsDelta} pts due to ${descriptor}.`;
  const message = eventTitle ? `${baseMessage} (${eventTitle})` : baseMessage;

  return createNotification({
    userId,
    title,
    message,
    type: positive ? "success" : "warning",
    metadata: {
      ...metadata,
      action,
      pointsDelta,
      notificationKind: "gamification_points",
    },
  });
}

async function notifyBadgeUnlocked({ userId, badge, context = {} }) {
  if (!userId || !badge) {
    return null;
  }

  const title = `New Badge: ${badge.achievement_name}`;
  const message =
    badge.achievement_description ||
    "You unlocked a new badge! Keep up the amazing work.";

  return createNotification({
    userId,
    title,
    message,
    type: "success",
    metadata: {
      badgeCode: badge.badge_code,
      badgeId: badge.achievement_id,
      pointsBonus: badge.achievement_points || 0,
      notificationKind: "gamification_badge",
      triggerAction: context.triggerAction || null,
      eventId: context.eventId || null,
      eventUid: context.eventUid || null,
    },
  });
}

/**
 * Send push notification via Firebase Cloud Messaging
 * @param {string} fcmToken - FCM device token
 * @param {Object} notification - Notification payload
 * @param {string} userId - User ID for logging (optional)
 * @returns {Promise<{success: boolean, error?: string}>} Result with success status and error if any
 */
async function sendPushNotification(fcmToken, { title, body, data = {} }, userId = null) {
  if (!fcmToken) {
    console.warn("[Push] No FCM token provided, skipping notification");
    return { success: false, error: "No FCM token" };
  }

  if (!initializeFirebase()) {
    console.warn("[Push] Firebase not initialized, skipping push notification");
    return { success: false, error: "Firebase not initialized" };
  }

  const tokenPreview = fcmToken.substring(0, 20) + "...";
  const userInfo = userId ? ` (User ID: ${userId})` : "";

  try {
    const message = {
      notification: {
        title,
        body,
      },
      data: {
        ...data,
        clickAction: data.actionUrl || "",
        timestamp: new Date().toISOString(),
      },
      token: fcmToken,
      webpush: {
        fcmOptions: {
          link: data.actionUrl || "/dashboard",
        },
      },
    };

    const response = await admin.messaging().send(message);
    console.log(`[Push] ✅ Successfully sent to ${tokenPreview}${userInfo}`);
    console.log(`[Push]    Message ID: ${response}`);
    return { success: true, messageId: response };
  } catch (error) {
    const errorCode = error.code || "unknown";
    const errorMessage = error.message || "Unknown error";
    
    console.error(`[Push] ❌ Failed to send to ${tokenPreview}${userInfo}`);
    console.error(`[Push]    Error Code: ${errorCode}`);
    console.error(`[Push]    Error Message: ${errorMessage}`);

    // Remove invalid tokens
    if (
      errorCode === "messaging/invalid-registration-token" ||
      errorCode === "messaging/registration-token-not-registered" ||
      errorCode === "messaging/invalid-argument"
    ) {
      console.log(`[Push] 🗑️  Removing invalid FCM token: ${tokenPreview}${userInfo}`);
      try {
        await userSettingsRepository.removeFcmTokenByValue(fcmToken);
        console.log(`[Push] ✅ Invalid token removed successfully`);
      } catch (removeError) {
        console.error(`[Push] ❌ Failed to remove invalid token:`, removeError.message);
      }
    }

    return { success: false, error: `${errorCode}: ${errorMessage}` };
  }
}

/**
 * Send bulk push notifications using FCM multicast
 * @param {Array} usersWithTokens - Array of {user_id, fcm_token, name, email}
 * @param {Object} notification - Notification payload {title, body, data}
 * @returns {Promise<Object>} Detailed results with success/failure counts and error details
 */
async function sendBulkPushNotifications(usersWithTokens, notification) {
  const totalUsers = usersWithTokens?.length || 0;
  
  console.log(`\n[Push Bulk] 🚀 Starting bulk push notification send`);
  console.log(`[Push Bulk] 📊 Total recipients: ${totalUsers}`);

  if (!initializeFirebase()) {
    console.warn(`[Push Bulk] ⚠️  Firebase not initialized, skipping all ${totalUsers} notifications`);
    return { 
      successCount: 0, 
      failureCount: totalUsers,
      errors: [{ error: "Firebase not initialized", count: totalUsers }]
    };
  }

  if (!totalUsers) {
    console.log(`[Push Bulk] ℹ️  No users with push enabled, skipping`);
    return { successCount: 0, failureCount: 0, errors: [] };
  }

  const { title, body, data = {} } = notification;
  const chunkSize = 500; // FCM limit
  let successCount = 0;
  let failureCount = 0;
  const errors = [];
  const invalidTokens = [];

  console.log(`[Push Bulk] 📧 Notification: "${title}"`);
  console.log(`[Push Bulk] 📦 Processing in chunks of ${chunkSize}`);

  // Process in chunks of 500
  for (let i = 0; i < usersWithTokens.length; i += chunkSize) {
    const chunk = usersWithTokens.slice(i, i + chunkSize);
    const tokens = chunk.map((u) => u.fcm_token).filter(Boolean);
    const chunkNumber = Math.floor(i / chunkSize) + 1;
    const totalChunks = Math.ceil(usersWithTokens.length / chunkSize);

    if (tokens.length === 0) {
      console.warn(`[Push Bulk] ⚠️  Chunk ${chunkNumber}/${totalChunks}: No valid tokens, skipping`);
      failureCount += chunk.length;
      continue;
    }

    console.log(`[Push Bulk] 📤 Processing chunk ${chunkNumber}/${totalChunks} (${tokens.length} tokens)`);

    try {
      const message = {
        notification: { title, body },
        data: {
          ...data,
          clickAction: data.actionUrl || "",
          timestamp: new Date().toISOString(),
        },
        webpush: {
          fcmOptions: {
            link: data.actionUrl || "/dashboard",
          },
        },
        tokens,
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      const chunkSuccess = response.successCount || 0;
      const chunkFailure = response.failureCount || 0;
      
      successCount += chunkSuccess;
      failureCount += chunkFailure;

      console.log(`[Push Bulk] ✅ Chunk ${chunkNumber}/${totalChunks} complete: ${chunkSuccess} sent, ${chunkFailure} failed`);

      // Process individual responses for detailed logging
      if (response.responses) {
        response.responses.forEach((resp, idx) => {
          const user = chunk[idx];
          const token = tokens[idx];
          const tokenPreview = token ? token.substring(0, 20) + "..." : "unknown";
          const userInfo = user ? ` (User: ${user.name || user.user_id})` : "";

          if (resp.success) {
            // Detailed success logging for first few in chunk
            if (idx < 3 || chunkFailure > 0) {
              console.log(`[Push Bulk]   ✅ Sent to ${tokenPreview}${userInfo}`);
            }
          } else {
            const errorCode = resp.error?.code || "unknown";
            const errorMessage = resp.error?.message || "Unknown error";
            
            console.error(`[Push Bulk]   ❌ Failed to ${tokenPreview}${userInfo}`);
            console.error(`[Push Bulk]      Code: ${errorCode}`);
            console.error(`[Push Bulk]      Message: ${errorMessage}`);

            // Track error types
            const existingError = errors.find(e => e.code === errorCode);
            if (existingError) {
              existingError.count++;
            } else {
              errors.push({ code: errorCode, message: errorMessage, count: 1 });
            }

            // Mark invalid tokens for removal
            if (
              errorCode === "messaging/invalid-registration-token" ||
              errorCode === "messaging/registration-token-not-registered" ||
              errorCode === "messaging/invalid-argument"
            ) {
              invalidTokens.push({ token, user: user?.name || user?.user_id, userInfo });
            }
          }
        });
      }
    } catch (error) {
      const errorMessage = error.message || "Unknown error";
      console.error(`[Push Bulk] ❌ Chunk ${chunkNumber}/${totalChunks} failed completely:`, errorMessage);
      console.error(`[Push Bulk]    Error details:`, error);
      
      failureCount += chunk.length;
      
      const existingError = errors.find(e => e.message === errorMessage);
      if (existingError) {
        existingError.count += chunk.length;
      } else {
        errors.push({ code: error.code || "chunk_error", message: errorMessage, count: chunk.length });
      }
    }
  }

  // Clean up invalid tokens
  if (invalidTokens.length > 0) {
    console.log(`[Push Bulk] 🗑️  Removing ${invalidTokens.length} invalid tokens...`);
    
    for (const { token, userInfo } of invalidTokens) {
      try {
        await userSettingsRepository.removeFcmTokenByValue(token);
        console.log(`[Push Bulk]   ✅ Removed token${userInfo}`);
      } catch (removeError) {
        console.error(`[Push Bulk]   ❌ Failed to remove token${userInfo}:`, removeError.message);
      }
    }
  }

  // Final summary
  console.log(`\n[Push Bulk] 📊 Final Results:`);
  console.log(`[Push Bulk]   ✅ Successful: ${successCount}/${totalUsers} (${((successCount/totalUsers)*100).toFixed(1)}%)`);
  console.log(`[Push Bulk]   ❌ Failed: ${failureCount}/${totalUsers} (${((failureCount/totalUsers)*100).toFixed(1)}%)`);
  
  if (errors.length > 0) {
    console.log(`[Push Bulk] 📋 Error Summary:`);
    errors.forEach(err => {
      console.log(`[Push Bulk]   - ${err.code}: ${err.count} occurrences`);
      console.log(`[Push Bulk]     "${err.message}"`);
    });
  }

  return { 
    successCount, 
    failureCount,
    totalUsers,
    errors,
    invalidTokensRemoved: invalidTokens.length
  };
}

/**
 * Create bulk in-app notifications
 * @param {Array} userIds - Array of user IDs
 * @param {Object} notification - Notification data
 * @returns {Promise<number>} Number of notifications created
 */
async function createBulkNotifications(
  userIds,
  { title, message, type = "info", actionUrl = null, metadata = null }
) {
  if (!userIds || userIds.length === 0) {
    return 0;
  }

  const pool = getPool();
  const metadataJson = toJson(metadata);
  const chunkSize = 500;
  let totalCreated = 0;

  // Insert in batches for performance
  for (let i = 0; i < userIds.length; i += chunkSize) {
    const chunk = userIds.slice(i, i + chunkSize);
    const values = chunk.map((userId) => [
      userId,
      title,
      message,
      type,
      actionUrl,
      metadataJson,
    ]);

    try {
      const [result] = await pool.query(
        `INSERT INTO notifications (user_id, title, message, type, action_url, metadata)
         VALUES ?`,
        [values]
      );
      totalCreated += result.affectedRows;
    } catch (error) {
      console.error("Error creating bulk notifications:", error);
    }
  }

  return totalCreated;
}

/**
 * Notify all users when an event is published
 * @param {Object} event - Event object
 * @returns {Promise<Object>} Notification results
 */
async function notifyEventPublished(event) {
  try {
    const title = `📅 New Event: ${event.title}`;
    const message = `A new ${event.event_type || "event"} has been published. Check it out!`;
    const actionUrl = `/dashboard?content=event&eventUid=${event.uid}`;
    const metadata = {
      source_type: "event",
      source_id: event.event_id,
      event_uid: event.uid,
      event_type: event.event_type,
      start_datetime: event.start_datetime,
    };

    // Fetch users for all notification channels in parallel
    const [allActiveUsers, pushEnabledUsers, emailEnabledUsers] = await Promise.all([
      userRepository.getAllActiveUsers(),
      userSettingsRepository.getUsersWithPushEnabled(),
      userSettingsRepository.getUsersWithEmailEnabled(),
    ]);

    // Create in-app, push, and email notifications in parallel
    const [inAppCount, pushResults, emailResults] = await Promise.allSettled([
      createBulkNotifications(allActiveUsers, {
        title,
        message,
        type: "info",
        actionUrl,
        metadata,
      }),
      sendBulkPushNotifications(pushEnabledUsers, {
        title,
        body: message,
        data: { actionUrl, ...metadata },
      }),
      emailService.sendBulkEmails(
        emailEnabledUsers,
        `New Event: ${event.title}`,
        (recipient) => emailService.generateEventPublishedEmailHTML(event, recipient.name),
        (recipient) => emailService.generateEventPublishedEmailText(event, recipient.name)
      ),
    ]);

    const result = {
      inAppNotifications: inAppCount.status === "fulfilled" ? inAppCount.value : 0,
      pushNotifications:
        pushResults.status === "fulfilled" ? pushResults.value : { successCount: 0, failureCount: 0, errors: [] },
      emailNotifications:
        emailResults.status === "fulfilled" ? emailResults.value : { successCount: 0, failureCount: 0, errors: [] },
      totalUsers: allActiveUsers.length,
      pushEnabledUsers: pushEnabledUsers.length,
      emailEnabledUsers: emailEnabledUsers.length,
    };

    // Log comprehensive results
    console.log(`\n========================================`);
    console.log(`📅 EVENT PUBLISHED NOTIFICATION RESULTS`);
    console.log(`========================================`);
    console.log(`Event: "${event.title}"`);
    console.log(`\n👥 User Statistics:`);
    console.log(`   Total Active Users: ${result.totalUsers}`);
    console.log(`   Push Enabled: ${result.pushEnabledUsers}`);
    console.log(`   Email Enabled: ${result.emailEnabledUsers}`);
    console.log(`\n🔔 In-App Notifications:`);
    console.log(`   Created: ${result.inAppNotifications}`);
    console.log(`\n📱 Push Notifications:`);
    console.log(`   ✅ Successful: ${result.pushNotifications.successCount}`);
    console.log(`   ❌ Failed: ${result.pushNotifications.failureCount}`);
    if (result.pushNotifications.invalidTokensRemoved) {
      console.log(`   🗑️  Invalid tokens removed: ${result.pushNotifications.invalidTokensRemoved}`);
    }
    console.log(`\n📧 Email Notifications:`);
    console.log(`   ✅ Successful: ${result.emailNotifications.successCount}`);
    console.log(`   ❌ Failed: ${result.emailNotifications.failureCount}`);
    console.log(`========================================\n`);
    
    return result;
  } catch (error) {
    console.error("Error notifying event published:", error);
    throw error;
  }
}

/**
 * Notify all users when an announcement/post is published
 * @param {Object} post - Post object
 * @returns {Promise<Object>} Notification results
 */
async function notifyAnnouncementPublished(post) {
  try {
    const isNews = post.post_type === "news_update";
    const emoji = isNews ? "📰" : "📢";
    const typeLabel = isNews ? "News & Update" : "Announcement";

    const title = `${emoji} New ${typeLabel}: ${post.title}`;
    const message =
      post.content && post.content.length > 150
        ? post.content.substring(0, 150) + "..."
        : post.content || `A new ${typeLabel.toLowerCase()} has been published.`;

    const actionUrl = `/dashboard?content=post&postUid=${post.uid}`;
    const metadata = {
      source_type: "post",
      source_id: post.post_id,
      post_uid: post.uid,
      post_type: post.post_type,
      author_id: post.author_id,
    };

    // Fetch users for all notification channels in parallel
    const [allActiveUsers, pushEnabledUsers, emailEnabledUsers] = await Promise.all([
      userRepository.getAllActiveUsers(),
      userSettingsRepository.getUsersWithPushEnabled(),
      userSettingsRepository.getUsersWithEmailEnabled(),
    ]);

    // Create in-app, push, and email notifications in parallel
    const [inAppCount, pushResults, emailResults] = await Promise.allSettled([
      createBulkNotifications(allActiveUsers, {
        title,
        message,
        type: isNews ? "info" : "alert",
        actionUrl,
        metadata,
      }),
      sendBulkPushNotifications(pushEnabledUsers, {
        title,
        body: message,
        data: { actionUrl, ...metadata },
      }),
      emailService.sendBulkEmails(
        emailEnabledUsers,
        `${typeLabel}: ${post.title}`,
        (recipient) => emailService.generateAnnouncementPublishedEmailHTML(post, recipient.name),
        (recipient) => emailService.generateAnnouncementPublishedEmailText(post, recipient.name)
      ),
    ]);

    const result = {
      inAppNotifications: inAppCount.status === "fulfilled" ? inAppCount.value : 0,
      pushNotifications:
        pushResults.status === "fulfilled" ? pushResults.value : { successCount: 0, failureCount: 0, errors: [] },
      emailNotifications:
        emailResults.status === "fulfilled" ? emailResults.value : { successCount: 0, failureCount: 0, errors: [] },
      totalUsers: allActiveUsers.length,
      pushEnabledUsers: pushEnabledUsers.length,
      emailEnabledUsers: emailEnabledUsers.length,
    };

    // Log comprehensive results
    console.log(`\n========================================`);
    console.log(`${emoji} ${isNews ? "NEWS" : "ANNOUNCEMENT"} PUBLISHED NOTIFICATION RESULTS`);
    console.log(`========================================`);
    console.log(`Post: "${post.title}"`);
    console.log(`\n👥 User Statistics:`);
    console.log(`   Total Active Users: ${result.totalUsers}`);
    console.log(`   Push Enabled: ${result.pushEnabledUsers}`);
    console.log(`   Email Enabled: ${result.emailEnabledUsers}`);
    console.log(`\n🔔 In-App Notifications:`);
    console.log(`   Created: ${result.inAppNotifications}`);
    console.log(`\n📱 Push Notifications:`);
    console.log(`   ✅ Successful: ${result.pushNotifications.successCount}`);
    console.log(`   ❌ Failed: ${result.pushNotifications.failureCount}`);
    if (result.pushNotifications.invalidTokensRemoved) {
      console.log(`   🗑️  Invalid tokens removed: ${result.pushNotifications.invalidTokensRemoved}`);
    }
    console.log(`\n📧 Email Notifications:`);
    console.log(`   ✅ Successful: ${result.emailNotifications.successCount}`);
    console.log(`   ❌ Failed: ${result.emailNotifications.failureCount}`);
    console.log(`========================================\n`);
    
    return result;
  } catch (error) {
    console.error("Error notifying announcement published:", error);
    throw error;
  }
}

/**
 * Notify participants when an event is cancelled
 * @param {Object} event - Event object
 * @param {Array<number>} participantIds - Array of user IDs to notify
 * @returns {Promise<Object>} Notification results
 */
async function notifyEventCancelled(event, participantIds = []) {
  try {
    if (!Array.isArray(participantIds) || participantIds.length === 0) {
      return { inApp: 0, push: { successCount: 0, failureCount: 0 }, email: { successCount: 0, failureCount: 0 } };
    }

    const title = `❌ Event Cancelled: ${event.title}`;
    const message = `The event '${event.title}' has been cancelled.`;
    const actionUrl = `/dashboard?content=event&eventUid=${event.uid}`;
    const metadata = {
      source_type: "event",
      source_id: event.event_id,
      event_uid: event.uid,
    };

    // Fetch push/email enabled users and filter by participant IDs
    const [pushEnabledUsers, emailEnabledUsers] = await Promise.all([
      userSettingsRepository.getUsersWithPushEnabled(),
      userSettingsRepository.getUsersWithEmailEnabled(),
    ]);

    const participantIdSet = new Set(participantIds.map((id) => Number(id)));
    const pushUsersForParticipants = pushEnabledUsers.filter((u) => participantIdSet.has(u.user_id));
    const emailUsersForParticipants = emailEnabledUsers.filter((u) => participantIdSet.has(u.user_id));

    const [inAppCount, pushResults, emailResults] = await Promise.allSettled([
      createBulkNotifications(participantIds, { title, message, type: "alert", actionUrl, metadata }),
      sendBulkPushNotifications(pushUsersForParticipants, { title, body: message, data: { actionUrl, ...metadata } }),
      emailService.sendBulkEmails(
        emailUsersForParticipants,
        `Event Cancelled: ${event.title}`,
        (recipient) => emailService.generateEventCancelledEmailHTML(event, recipient.name),
        (recipient) => emailService.generateEventCancelledEmailText(event, recipient.name)
      ),
    ]);

    const result = {
      inAppNotifications: inAppCount.status === "fulfilled" ? inAppCount.value : 0,
      pushNotifications: pushResults.status === "fulfilled" ? pushResults.value : { successCount: 0, failureCount: 0, errors: [] },
      emailNotifications: emailResults.status === "fulfilled" ? emailResults.value : { successCount: 0, failureCount: 0, errors: [] },
      pushRecipients: pushUsersForParticipants.length,
      emailRecipients: emailUsersForParticipants.length,
    };

    console.log(`Event cancel notifications: inApp=${result.inAppNotifications}, pushRecipients=${result.pushRecipients}, emailRecipients=${result.emailRecipients}`);
    return result;
  } catch (error) {
    console.error("Error notifying event cancelled:", error);
    throw error;
  }
}

/**
 * Notify a single user when they are promoted from the waitlist to registered
 * @param {Object} event - Event object
 * @param {number} promotedUserId - User ID of promoted participant
 */
async function notifyWaitlistPromotion(event, promotedUserId) {
  try {
    if (!promotedUserId) return null;

    const userSettings = await userSettingsRepository.getUserSettings(promotedUserId);
    const title = `🎉 Waitlist Promotion: ${event.title}`;
    const message = `Good news! You've been moved from the waitlist to registered for '${event.title}'.`;
    const actionUrl = `/dashboard?content=event&eventUid=${event.uid}`;
    const metadata = { source_type: 'event', source_id: event.event_id, event_uid: event.uid };

    // In-app notification
    await createNotification({ userId: promotedUserId, title, message, type: 'success', actionUrl, metadata });

    // Push
    if (userSettings?.push_notifications_enabled && userSettings?.fcm_token) {
      await sendPushNotification(userSettings.fcm_token, { title, body: message, data: { actionUrl, ...metadata } }, promotedUserId);
    }

    // Email
    if (userSettings?.email_notifications_enabled) {
      const user = await userRepository.getById(promotedUserId);
      if (user?.email) {
        const html = emailService.generateEventPromotedEmailHTML(event, user.name || 'Volunteer');
        const text = emailService.generateEventPromotedEmailText(event, user.name || 'Volunteer');
        await emailService.sendEmail(user.email, `You're registered for ${event.title}`, html, text);
      }
    }

    return true;
  } catch (error) {
    console.error('Error notifying waitlist promotion:', error);
    return null;
  }
}

/**
 * Notify participants about a reminder for an event
 * @param {Object} event
 * @param {Array<number>} participantIds
 */
async function notifyEventReminder(event, participantIds = []) {
  try {
    if (!Array.isArray(participantIds) || participantIds.length === 0) {
      return { inApp: 0, push: { successCount: 0, failureCount: 0 }, email: { successCount: 0, failureCount: 0 } };
    }

    const title = `⏰ Reminder: ${event.title} starts soon`;
    const message = `Reminder: the event '${event.title}' will start at ${event.start_datetime}.`;
    const actionUrl = `/dashboard?content=event&eventUid=${event.uid}`;
    const metadata = { source_type: 'event', source_id: event.event_id, event_uid: event.uid };

    // Fetch push/email users and filter by participant IDs
    const [pushEnabledUsers, emailEnabledUsers] = await Promise.all([
      userSettingsRepository.getUsersWithPushEnabled(),
      userSettingsRepository.getUsersWithEmailEnabled(),
    ]);

    const participantIdSet = new Set(participantIds.map((id) => Number(id)));
    const pushUsersForParticipants = pushEnabledUsers.filter((u) => participantIdSet.has(u.user_id));
    const emailUsersForParticipants = emailEnabledUsers.filter((u) => participantIdSet.has(u.user_id));

    const [inAppCount, pushResults, emailResults] = await Promise.allSettled([
      createBulkNotifications(participantIds, { title, message, type: 'info', actionUrl, metadata }),
      sendBulkPushNotifications(pushUsersForParticipants, { title, body: message, data: { actionUrl, ...metadata } }),
      emailService.sendBulkEmails(
        emailUsersForParticipants,
        `Reminder: ${event.title}`,
        (recipient) => emailService.generateEventReminderEmailHTML(event, recipient.name),
        (recipient) => emailService.generateEventReminderEmailText(event, recipient.name)
      ),
    ]);

    const result = {
      inAppNotifications: inAppCount.status === 'fulfilled' ? inAppCount.value : 0,
      pushNotifications: pushResults.status === 'fulfilled' ? pushResults.value : { successCount: 0, failureCount: 0, errors: [] },
      emailNotifications: emailResults.status === 'fulfilled' ? emailResults.value : { successCount: 0, failureCount: 0, errors: [] },
      pushRecipients: pushUsersForParticipants.length,
      emailRecipients: emailUsersForParticipants.length,
    };

    console.log(`Event reminder notifications: inApp=${result.inAppNotifications}, pushRecipients=${result.pushRecipients}, emailRecipients=${result.emailRecipients}`);

    return result;
  } catch (error) {
    console.error('Error notifying event reminder:', error);
    throw error;
  }
}

module.exports = {
  createNotification,
  notifyGamificationPoints,
  notifyBadgeUnlocked,
  sendPushNotification,
  sendBulkPushNotifications,
  createBulkNotifications,
  notifyEventPublished,
  notifyEventCancelled,
  notifyAnnouncementPublished,
  notifyWaitlistPromotion,
  notifyEventReminder,
};
