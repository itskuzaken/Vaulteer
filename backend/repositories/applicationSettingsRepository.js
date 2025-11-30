const { getPool } = require('../db/pool');

/**
 * Get current application settings
 * @returns {Promise<Object>} Application settings object
 */
async function getSettings() {
  const pool = getPool();
  const [rows] = await pool.query(
    'SELECT * FROM application_settings ORDER BY id DESC LIMIT 1'
  );
  return rows[0] || null;
}

/**
 * Update application settings
 * @param {Object} settings - Settings to update
 * @returns {Promise<Object>} Updated settings
 */
async function updateSettings(settings) {
  const pool = getPool();
  const { is_open, deadline, opened_by, closed_by, auto_closed } = settings;
  
  const [result] = await pool.query(
    `UPDATE application_settings 
     SET is_open = ?,
         deadline = ?,
         opened_at = CASE WHEN ? = TRUE AND is_open = FALSE THEN NOW() ELSE opened_at END,
         opened_by = CASE WHEN ? = TRUE AND is_open = FALSE THEN ? ELSE opened_by END,
         closed_at = CASE WHEN ? = FALSE AND is_open = TRUE THEN NOW() ELSE closed_at END,
         closed_by = CASE WHEN ? = FALSE AND is_open = TRUE THEN ? ELSE closed_by END,
         auto_closed = ?,
         updated_at = NOW()
     WHERE id = (SELECT id FROM (SELECT id FROM application_settings ORDER BY id DESC LIMIT 1) AS t)`,
    [is_open, deadline, is_open, is_open, opened_by, is_open, is_open, closed_by, auto_closed]
  );
  
  if (result.affectedRows === 0) {
    throw new Error('Failed to update application settings');
  }
  
  return getSettings();
}

/**
 * Open applications with optional deadline
 * @param {string|null} deadline - Deadline datetime in ISO format
 * @param {string} userId - User ID who opened applications
 * @returns {Promise<Object>} Updated settings
 */
async function openApplications(deadline, userId) {
  return updateSettings({
    is_open: true,
    deadline: deadline || null,
    opened_by: userId,
    closed_by: null,
    auto_closed: false
  });
}

/**
 * Close applications
 * @param {string} userId - User ID who closed applications (null for auto-close)
 * @param {boolean} autoClose - Whether this is an automatic close
 * @returns {Promise<Object>} Updated settings
 */
async function closeApplications(userId, autoClose = false) {
  const currentSettings = await getSettings();
  
  return updateSettings({
    is_open: false,
    deadline: currentSettings.deadline,
    opened_by: currentSettings.opened_by,
    closed_by: userId,
    auto_closed: autoClose
  });
}

/**
 * Check if applications are currently open
 * @returns {Promise<boolean>} True if open
 */
async function isOpen() {
  const settings = await getSettings();
  return settings ? settings.is_open : false;
}

/**
 * Check if deadline has passed
 * @returns {Promise<boolean>} True if deadline has passed
 */
async function isDeadlinePassed() {
  const settings = await getSettings();
  if (!settings || !settings.deadline || !settings.is_open) {
    return false;
  }
  
  return new Date(settings.deadline) < new Date();
}

module.exports = {
  getSettings,
  updateSettings,
  openApplications,
  closeApplications,
  isOpen,
  isDeadlinePassed
};
