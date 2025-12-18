/**
 * System Settings Repository
 * 
 * Handles database operations for system_settings and event_type_definitions tables.
 * Includes in-memory caching with TTL for performance.
 */

const { getPool } = require('../db/pool');

// In-memory cache with TTL
const cache = {
  settings: new Map(),
  eventTypes: null,
  lastFetch: {
    settings: new Map(),
    eventTypes: null
  }
};

const CACHE_TTL_MS = 60 * 1000; // 1 minute cache TTL

/**
 * Safely parse JSON fields which may already be objects (mysql2 returns JSON columns as objects).
 * @param {string|object|null} v
 * @returns {object|null}
 */
function parseJsonOrNull(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'object') return v;
  if (typeof v === 'string') {
    try {
      return JSON.parse(v);
    } catch (e) {
      return null;
    }
  }
  return null;
}
/**
 * Check if cache entry is still valid
 */
function isCacheValid(key, type = 'settings') {
  const lastFetch = type === 'settings' 
    ? cache.lastFetch.settings.get(key) 
    : cache.lastFetch.eventTypes;
  
  if (!lastFetch) return false;
  return (Date.now() - lastFetch) < CACHE_TTL_MS;
}

/**
 * Invalidate cache for a category or all
 */
function invalidateCache(category = null) {
  if (category) {
    cache.settings.delete(category);
    cache.lastFetch.settings.delete(category);
    console.log(`[SystemSettings] Cache invalidated for category: ${category}`);
  } else {
    cache.settings.clear();
    cache.lastFetch.settings.clear();
    cache.eventTypes = null;
    cache.lastFetch.eventTypes = null;
    console.log('[SystemSettings] All cache invalidated');
  }
}

// ==================== SYSTEM SETTINGS ====================

/**
 * Get all settings for a category
 * @param {string} category - gamification, events, notifications, system, ocr
 * @returns {Promise<Array>} Array of settings
 */
async function getSettingsByCategory(category) {
  // Check cache first
  if (isCacheValid(category)) {
    return cache.settings.get(category);
  }
  
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT 
      setting_id,
      category,
      \`key\`,
      value,
      data_type,
      description,
      default_value,
      validation_rules,
      is_editable,
      display_order,
      updated_by,
      updated_at
     FROM system_settings 
     WHERE category = ?
     ORDER BY display_order, \`key\``,
    [category]
  );
  
  // Parse JSON fields
  const settings = rows.map(row => ({
    ...row,
    validation_rules: parseJsonOrNull(row.validation_rules),
    // Parse value based on data_type
    parsedValue: parseValue(row.value, row.data_type)
  }));
  
  // Update cache
  cache.settings.set(category, settings);
  cache.lastFetch.settings.set(category, Date.now());
  
  return settings;
}

/**
 * Get all settings (all categories)
 * @returns {Promise<Object>} Settings grouped by category
 */
async function getAllSettings() {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT 
      setting_id,
      category,
      \`key\`,
      value,
      data_type,
      description,
      default_value,
      validation_rules,
      is_editable,
      display_order,
      updated_by,
      updated_at
     FROM system_settings 
     ORDER BY category, display_order, \`key\``
  );
  
  // Group by category
  const grouped = {};
  for (const row of rows) {
    if (!grouped[row.category]) {
      grouped[row.category] = [];
    }
    grouped[row.category].push({
      ...row,
      validation_rules: parseJsonOrNull(row.validation_rules),
      parsedValue: parseValue(row.value, row.data_type)
    });
  }
  
  return grouped;
}

/**
 * Get a single setting by category and key
 * @param {string} category 
 * @param {string} key 
 * @returns {Promise<Object|null>}
 */
async function getSetting(category, key) {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT 
      setting_id,
      category,
      \`key\`,
      value,
      data_type,
      description,
      default_value,
      validation_rules,
      is_editable,
      updated_by,
      updated_at
     FROM system_settings 
     WHERE category = ? AND \`key\` = ?`,
    [category, key]
  );
  
  if (rows.length === 0) return null;
  
  const row = rows[0];
  return {
    ...row,
    validation_rules: parseJsonOrNull(row.validation_rules),
    parsedValue: parseValue(row.value, row.data_type)
  };
}

/**
 * Get setting value directly (convenience method)
 * @param {string} category 
 * @param {string} key 
 * @param {*} defaultValue - Default if not found
 * @returns {Promise<*>} Parsed value
 */
async function getSettingValue(category, key, defaultValue = null) {
  const setting = await getSetting(category, key);
  return setting ? setting.parsedValue : defaultValue;
}

/**
 * Update a single setting
 * @param {number} settingId 
 * @param {string} value 
 * @param {number|null} updatedBy - User ID making the change
 * @returns {Promise<Object>} Updated setting
 */
async function updateSetting(settingId, value, updatedBy = null) {
  const pool = getPool();
  
  // Get current setting to find category for cache invalidation
  const [current] = await pool.query(
    'SELECT category, `key`, data_type, validation_rules, is_editable FROM system_settings WHERE setting_id = ?',
    [settingId]
  );
  
  if (current.length === 0) {
    throw new Error(`Setting not found: ${settingId}`);
  }
  
  const setting = current[0];
  
  if (!setting.is_editable) {
    throw new Error(`Setting is not editable: ${setting.key}`);
  }
  
  // Validate value against rules
  const validationRules = parseJsonOrNull(setting.validation_rules);
  validateValue(value, setting.data_type, validationRules);
  
  // Update
  await pool.query(
    `UPDATE system_settings 
     SET value = ?, updated_by = ?, updated_at = NOW()
     WHERE setting_id = ?`,
    [value, updatedBy, settingId]
  );
  
  // Invalidate cache for this category
  invalidateCache(setting.category);
  
  return getSetting(setting.category, setting.key);
}

/**
 * Update setting by category and key
 * @param {string} category 
 * @param {string} key 
 * @param {string} value 
 * @param {number|null} updatedBy 
 * @returns {Promise<Object>}
 */
async function updateSettingByKey(category, key, value, updatedBy = null) {
  const setting = await getSetting(category, key);
  const pool = getPool();

  if (!setting) {
    // Create a new setting when missing. Attempt to infer data type (number, boolean, string)
    const strVal = String(value).trim();
    let data_type = 'string';
    if (strVal.toLowerCase() === 'true' || strVal.toLowerCase() === 'false') {
      data_type = 'boolean';
    } else if (!Number.isNaN(Number(strVal))) {
      data_type = 'number';
    }

    const default_value = String(value);

    // Known key metadata (add more as needed)
    const known = {
      'inactive_after_days': {
        description: 'Number of units before a user is automatically marked inactive',
        validation_rules: JSON.stringify({ min: 1, max: 3650 }),
        display_order: 1
      },
      'inactive_after_unit': {
        description: 'Unit for inactivity period (days/weeks/months)',
        validation_rules: JSON.stringify({ allowedValues: ['days', 'weeks', 'months'] }),
        data_type: 'enum',
        display_order: 2
      },
      'enable_auto_deactivate': {
        description: 'Automatically mark users as inactive after a configured period',
        validation_rules: null,
        display_order: 3
      }
    };

    const meta = known[key] || {};

    // Allow meta to override inferred data_type (useful for enum)
    const finalDataType = meta.data_type || data_type;

    await pool.query(
      `INSERT INTO system_settings (category, ` + "`key`" + `, value, data_type, description, default_value, validation_rules, is_editable, display_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, NOW(), NOW())`,
      [category, key, default_value, finalDataType, meta.description || null, default_value, meta.validation_rules || null, meta.display_order || 999]
    );

    invalidateCache(category);

    return getSetting(category, key);
  }

  return updateSetting(setting.setting_id, value, updatedBy);
}

/**
 * Bulk update settings
 * @param {Array} updates - Array of { setting_id, value } or { category, key, value }
 * @param {number|null} updatedBy 
 * @returns {Promise<Object>} Results summary
 */
async function bulkUpdateSettings(updates, updatedBy = null) {
  const results = {
    success: [],
    failed: []
  };
  
  const categoriesToInvalidate = new Set();
  
  for (const update of updates) {
    try {
      let result;
      if (update.setting_id) {
        result = await updateSetting(update.setting_id, update.value, updatedBy);
      } else if (update.category && update.key) {
        result = await updateSettingByKey(update.category, update.key, update.value, updatedBy);
      } else {
        throw new Error('Must provide setting_id or category+key');
      }
      results.success.push(result);
      categoriesToInvalidate.add(result.category);
    } catch (error) {
      results.failed.push({
        ...update,
        error: error.message
      });
    }
  }
  
  // Invalidate all affected categories
  for (const category of categoriesToInvalidate) {
    invalidateCache(category);
  }
  
  return results;
}

/**
 * Reset setting to default value
 * @param {number} settingId 
 * @param {number|null} updatedBy 
 * @returns {Promise<Object>}
 */
async function resetToDefault(settingId, updatedBy = null) {
  const pool = getPool();
  
  const [current] = await pool.query(
    'SELECT category, `key`, default_value FROM system_settings WHERE setting_id = ?',
    [settingId]
  );
  
  if (current.length === 0) {
    throw new Error(`Setting not found: ${settingId}`);
  }
  
  await pool.query(
    `UPDATE system_settings 
     SET value = default_value, updated_by = ?, updated_at = NOW()
     WHERE setting_id = ?`,
    [updatedBy, settingId]
  );
  
  invalidateCache(current[0].category);
  
  return getSetting(current[0].category, current[0].key);
}

/**
 * Reset all settings in a category to defaults
 * @param {string} category 
 * @param {number|null} updatedBy 
 * @returns {Promise<number>} Number of settings reset
 */
async function resetCategoryToDefaults(category, updatedBy = null) {
  const pool = getPool();
  
  const [result] = await pool.query(
    `UPDATE system_settings 
     SET value = default_value, updated_by = ?, updated_at = NOW()
     WHERE category = ?`,
    [updatedBy, category]
  );
  
  invalidateCache(category);
  
  return result.affectedRows;
}

// ==================== EVENT TYPE DEFINITIONS ====================

/**
 * Get all event types
 * @param {boolean} activeOnly - Only return active types
 * @returns {Promise<Array>}
 */
async function getEventTypes(activeOnly = true) {
  // Check cache
  if (cache.eventTypes && isCacheValid(null, 'eventTypes')) {
    return activeOnly 
      ? cache.eventTypes.filter(t => t.is_active)
      : cache.eventTypes;
  }
  
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT 
      type_id,
      type_code,
      type_label,
      description,
      icon,
      color,
      points_per_participation,
      is_active,
      is_system,
      display_order
     FROM event_type_definitions 
     ORDER BY display_order, type_label`
  );
  
  // Update cache
  cache.eventTypes = rows;
  cache.lastFetch.eventTypes = Date.now();
  
  return activeOnly ? rows.filter(t => t.is_active) : rows;
}

/**
 * Get event type by code
 * @param {string} typeCode 
 * @returns {Promise<Object|null>}
 */
async function getEventTypeByCode(typeCode) {
  const types = await getEventTypes(false);
  return types.find(t => t.type_code === typeCode) || null;
}

/**
 * Create event type
 * @param {Object} data 
 * @returns {Promise<Object>}
 */
async function createEventType(data) {
  const pool = getPool();
  
  const { type_code, type_label, description, icon, color, display_order, points_per_participation } = data;
  
  const [result] = await pool.query(
    `INSERT INTO event_type_definitions 
     (type_code, type_label, description, icon, color, points_per_participation, display_order)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [type_code, type_label, description || null, icon || null, color || null, points_per_participation || 0, display_order || 0]
  );
  
  // Invalidate cache
  cache.eventTypes = null;
  cache.lastFetch.eventTypes = null;
  
  return getEventTypeByCode(type_code);
}

/**
 * Update event type
 * @param {number} typeId 
 * @param {Object} data 
 * @returns {Promise<Object>}
 */
async function updateEventType(typeId, data) {
  const pool = getPool();
  
  const updates = [];
  const values = [];
  
  const allowedFields = ['type_label', 'description', 'icon', 'color', 'points_per_participation', 'is_active', 'display_order'];
  
  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      updates.push(`${field} = ?`);
      values.push(data[field]);
    }
  }
  
  if (updates.length === 0) {
    throw new Error('No valid fields to update');
  }
  
  values.push(typeId);
  
  await pool.query(
    `UPDATE event_type_definitions SET ${updates.join(', ')} WHERE type_id = ?`,
    values
  );
  
  // Invalidate cache
  cache.eventTypes = null;
  cache.lastFetch.eventTypes = null;
  
  const [updated] = await pool.query(
    'SELECT * FROM event_type_definitions WHERE type_id = ?',
    [typeId]
  );
  
  return updated[0] || null;
}

/**
 * Delete event type (only non-system types)
 * @param {number} typeId 
 * @returns {Promise<boolean>}
 */
async function deleteEventType(typeId) {
  const pool = getPool();
  
  // Check if system type
  const [current] = await pool.query(
    'SELECT is_system FROM event_type_definitions WHERE type_id = ?',
    [typeId]
  );
  
  if (current.length === 0) {
    throw new Error('Event type not found');
  }
  
  if (current[0].is_system) {
    throw new Error('Cannot delete system event types');
  }
  
  await pool.query('DELETE FROM event_type_definitions WHERE type_id = ?', [typeId]);
  
  // Invalidate cache
  cache.eventTypes = null;
  cache.lastFetch.eventTypes = null;
  
  return true;
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Parse string value to correct type
 */
function parseValue(value, dataType) {
  switch (dataType) {
    case 'number':
      return parseFloat(value);
    case 'boolean':
      return value === 'true' || value === '1';
    case 'json':
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    case 'enum':
    case 'string':
    default:
      return value;
  }
}

/**
 * Validate value against rules
 */
function validateValue(value, dataType, rules) {
  if (!rules) return;
  
  switch (dataType) {
    case 'number': {
      const num = parseFloat(value);
      if (isNaN(num)) {
        throw new Error('Value must be a number');
      }
      if (rules.min !== undefined && num < rules.min) {
        throw new Error(`Value must be at least ${rules.min}`);
      }
      if (rules.max !== undefined && num > rules.max) {
        throw new Error(`Value must be at most ${rules.max}`);
      }
      break;
    }
    case 'string': {
      if (rules.maxLength && value.length > rules.maxLength) {
        throw new Error(`Value must be at most ${rules.maxLength} characters`);
      }
      if (rules.pattern && !new RegExp(rules.pattern).test(value)) {
        throw new Error('Value does not match required pattern');
      }
      break;
    }
    case 'enum': {
      if (rules.allowedValues && !rules.allowedValues.includes(value)) {
        throw new Error(`Value must be one of: ${rules.allowedValues.join(', ')}`);
      }
      break;
    }
    case 'json': {
      try {
        const parsed = JSON.parse(value);
        if (rules.type === 'array' && !Array.isArray(parsed)) {
          throw new Error('Value must be a JSON array');
        }
      } catch (e) {
        throw new Error('Value must be valid JSON');
      }
      break;
    }
  }
}

module.exports = {
  // System settings
  getSettingsByCategory,
  getAllSettings,
  getSetting,
  getSettingValue,
  updateSetting,
  updateSettingByKey,
  bulkUpdateSettings,
  resetToDefault,
  resetCategoryToDefaults,
  
  // Event types
  getEventTypes,
  getEventTypeByCode,
  createEventType,
  updateEventType,
  deleteEventType,
  
  // Cache management
  invalidateCache
};
