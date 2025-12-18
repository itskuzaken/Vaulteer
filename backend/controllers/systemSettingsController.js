/**
 * System Settings Controller
 * 
 * Handles HTTP requests for system settings management.
 * Admin-only endpoints for configuring gamification, events, notifications, etc.
 */

const systemSettingsRepository = require('../repositories/systemSettingsRepository');
const activityLogService = require('../services/activityLogService');

// Valid categories
const VALID_CATEGORIES = ['gamification', 'events', 'notifications', 'system', 'ocr'];

/**
 * Get all settings grouped by category (admin only)
 */
async function getAllSettings(req, res) {
  try {
    const settings = await systemSettingsRepository.getAllSettings();
    
    res.json({
      success: true,
      data: {
        settings,
        categories: VALID_CATEGORIES
      }
    });
  } catch (error) {
    console.error('[SystemSettings] Error fetching all settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch system settings'
    });
  }
}

/**
 * Get settings for a specific category
 */
async function getSettingsByCategory(req, res) {
  try {
    const { category } = req.params;
    
    if (!VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({
        success: false,
        message: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`
      });
    }
    
    const settings = await systemSettingsRepository.getSettingsByCategory(category);
    
    res.json({
      success: true,
      data: {
        category,
        settings
      }
    });
  } catch (error) {
    console.error('[SystemSettings] Error fetching category settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch settings'
    });
  }
}

/**
 * Get a single setting
 */
async function getSetting(req, res) {
  try {
    const { category, key } = req.params;
    
    if (!VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({
        success: false,
        message: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`
      });
    }
    
    const setting = await systemSettingsRepository.getSetting(category, key);
    
    if (!setting) {
      return res.status(404).json({
        success: false,
        message: `Setting not found: ${category}.${key}`
      });
    }
    
    res.json({
      success: true,
      data: { setting }
    });
  } catch (error) {
    console.error('[SystemSettings] Error fetching setting:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch setting'
    });
  }
}

/**
 * Update a single setting
 */
async function updateSetting(req, res) {
  try {
    const { settingId } = req.params;
    const { value } = req.body;
    const userId = req.authenticatedUser?.userId || null;
    
    if (value === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Value is required'
      });
    }
    
    const updatedSetting = await systemSettingsRepository.updateSetting(
      parseInt(settingId),
      String(value),
      userId
    );
    
    // Log activity
    await activityLogService.createLog({
      type: 'SETTINGS',
      action: 'SYSTEM_SETTING_UPDATED',
      performedBy: {
        userId: req.authenticatedUser?.userId,
        name: req.authenticatedUser?.name,
        role: req.authenticatedUser?.role
      },
      targetResource: {
        type: 'system_settings',
        id: settingId
      },
      description: `Updated ${updatedSetting.category}.${updatedSetting.key} to "${value}"`,
      metadata: {
        category: updatedSetting.category,
        key: updatedSetting.key,
        newValue: value,
        timestamp: new Date().toISOString()
      }
    });
    
    res.json({
      success: true,
      message: 'Setting updated successfully',
      data: { setting: updatedSetting }
    });
  } catch (error) {
    console.error('[SystemSettings] Error updating setting:', error);
    
    if (error.message.includes('not found') || error.message.includes('not editable')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to update setting'
    });
  }
}

/**
 * Update setting by category and key
 */
async function updateSettingByKey(req, res) {
  try {
    const { category, key } = req.params;
    const { value } = req.body;
    const userId = req.authenticatedUser?.userId || null;
    
    if (!VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({
        success: false,
        message: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`
      });
    }
    
    if (value === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Value is required'
      });
    }
    
    const updatedSetting = await systemSettingsRepository.updateSettingByKey(
      category,
      key,
      String(value),
      userId
    );

    // If badges were disabled, deactivate all achievements as well
    try {
      if (category === 'gamification' && key === 'enable_badges') {
        const enabled = String(value) === 'true' || String(value) === '1';
        if (!enabled) {
          const achievementRepo = require('../repositories/achievementRepository');
          const deactivatedCount = await achievementRepo.deactivateAllAchievements(userId);
          // Log this as an activity
          await activityLogService.createLog({
            type: 'SETTINGS',
            action: 'ACHIEVEMENTS_DEACTIVATED',
            performedBy: {
              userId: req.authenticatedUser?.userId,
              name: req.authenticatedUser?.name,
              role: req.authenticatedUser?.role
            },
            targetResource: { type: 'achievements', id: 'bulk' },
            description: `Disabled badges via settings and deactivated ${deactivatedCount} achievements`,
            metadata: { deactivatedCount, timestamp: new Date().toISOString() }
          });
        }
      }
    } catch (err) {
      console.warn('[SystemSettings] Failed to deactivate achievements after disabling badges:', err?.message || err);
    }
    
    // Log activity
    await activityLogService.createLog({
      type: 'SETTINGS',
      action: 'SYSTEM_SETTING_UPDATED',
      performedBy: {
        userId: req.authenticatedUser?.userId,
        name: req.authenticatedUser?.name,
        role: req.authenticatedUser?.role
      },
      targetResource: {
        type: 'system_settings',
        id: String(updatedSetting.setting_id)
      },
      description: `Updated ${category}.${key} to "${value}"`,
      metadata: {
        category,
        key,
        newValue: value,
        timestamp: new Date().toISOString()
      }
    });
    
    res.json({
      success: true,
      message: 'Setting updated successfully',
      data: { setting: updatedSetting }
    });
  } catch (error) {
    console.error('[SystemSettings] Error updating setting by key:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to update setting'
    });
  }
}

/**
 * Bulk update settings
 */
async function bulkUpdateSettings(req, res) {
  try {
    const { updates } = req.body;
    const userId = req.authenticatedUser?.userId || null;
    
    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Updates array is required'
      });
    }
    
    const results = await systemSettingsRepository.bulkUpdateSettings(updates, userId);
    
    // Log activity for successful updates
    if (results.success.length > 0) {
      await activityLogService.createLog({
        type: 'SETTINGS',
        action: 'SYSTEM_SETTINGS_BULK_UPDATE',
        performedBy: {
          userId: req.authenticatedUser?.userId,
          name: req.authenticatedUser?.name,
          role: req.authenticatedUser?.role
        },
        targetResource: {
          type: 'system_settings',
          id: 'bulk'
        },
        description: `Bulk updated ${results.success.length} settings`,
        metadata: {
          successCount: results.success.length,
          failedCount: results.failed.length,
          updatedSettings: results.success.map(s => `${s.category}.${s.key}`),
          timestamp: new Date().toISOString()
        }
      });
    }
    // If bulk updates included disabling badges, ensure achievements are deactivated
    try {
      const disabledBadgeUpdate = (results.success || []).some(s => s.category === 'gamification' && s.key === 'enable_badges' && (s.parsedValue === false || String(s.value) === 'false' || s.value === 'false'));
      if (disabledBadgeUpdate) {
        const achievementRepo = require('../repositories/achievementRepository');
        const deactivatedCount = await achievementRepo.deactivateAllAchievements(userId);
        await activityLogService.createLog({
          type: 'SETTINGS',
          action: 'ACHIEVEMENTS_DEACTIVATED',
          performedBy: {
            userId: req.authenticatedUser?.userId,
            name: req.authenticatedUser?.name,
            role: req.authenticatedUser?.role
          },
          targetResource: { type: 'achievements', id: 'bulk' },
          description: `Bulk update disabled badges and deactivated ${deactivatedCount} achievements`,
          metadata: { deactivatedCount, timestamp: new Date().toISOString() }
        });
      }
    } catch (err) {
      console.warn('[SystemSettings] Failed to handle bulk disable badges side-effect:', err?.message || err);
    }

    res.json({
      success: true,
      message: `Updated ${results.success.length} settings, ${results.failed.length} failed`,
      data: results
    });
  } catch (error) {
    console.error('[SystemSettings] Error bulk updating:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk update settings'
    });
  }
}

/**
 * Reset setting to default
 */
async function resetToDefault(req, res) {
  try {
    const { settingId } = req.params;
    const userId = req.authenticatedUser?.userId || null;
    
    const setting = await systemSettingsRepository.resetToDefault(parseInt(settingId), userId);
    
    // Log activity
    await activityLogService.createLog({
      type: 'SETTINGS',
      action: 'SYSTEM_SETTING_RESET',
      performedBy: {
        userId: req.authenticatedUser?.userId,
        name: req.authenticatedUser?.name,
        role: req.authenticatedUser?.role
      },
      targetResource: {
        type: 'system_settings',
        id: settingId
      },
      description: `Reset ${setting.category}.${setting.key} to default value`,
      metadata: {
        category: setting.category,
        key: setting.key,
        defaultValue: setting.default_value,
        timestamp: new Date().toISOString()
      }
    });
    
    res.json({
      success: true,
      message: 'Setting reset to default',
      data: { setting }
    });
  } catch (error) {
    console.error('[SystemSettings] Error resetting setting:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset setting'
    });
  }
}

/**
 * Reset all settings in a category to defaults
 */
async function resetCategoryToDefaults(req, res) {
  try {
    const { category } = req.params;
    const userId = req.authenticatedUser?.userId || null;
    
    if (!VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({
        success: false,
        message: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`
      });
    }
    
    const count = await systemSettingsRepository.resetCategoryToDefaults(category, userId);
    
    // Log activity
    await activityLogService.createLog({
      type: 'SETTINGS',
      action: 'SYSTEM_SETTINGS_CATEGORY_RESET',
      performedBy: {
        userId: req.authenticatedUser?.userId,
        name: req.authenticatedUser?.name,
        role: req.authenticatedUser?.role
      },
      targetResource: {
        type: 'system_settings',
        id: category
      },
      description: `Reset all ${category} settings to defaults (${count} settings)`,
      metadata: {
        category,
        resetCount: count,
        timestamp: new Date().toISOString()
      }
    });
    
    res.json({
      success: true,
      message: `Reset ${count} settings in ${category} to defaults`
    });
  } catch (error) {
    console.error('[SystemSettings] Error resetting category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset category settings'
    });
  }
}

// ==================== EVENT TYPES ====================

/**
 * Get all event types
 */
async function getEventTypes(req, res) {
  try {
    const activeOnly = req.query.activeOnly !== 'false';
    const types = await systemSettingsRepository.getEventTypes(activeOnly);
    
    res.json({
      success: true,
      data: { types }
    });
  } catch (error) {
    console.error('[SystemSettings] Error fetching event types:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch event types'
    });
  }
}

/**
 * Create event type
 */
async function createEventType(req, res) {
  try {
    const { type_code, type_label, description, icon, color, display_order, points_per_participation } = req.body;
    
    if (!type_code || !type_label) {
      return res.status(400).json({
        success: false,
        message: 'type_code and type_label are required'
      });
    }
    
    // Validate type_code format
    if (!/^[a-z_]+$/.test(type_code)) {
      return res.status(400).json({
        success: false,
        message: 'type_code must be lowercase with underscores only'
      });
    }
    
    const eventType = await systemSettingsRepository.createEventType({
      type_code,
      type_label,
      description,
      icon,
      color,
      points_per_participation: Number(points_per_participation) || 0,
      display_order
    });
    
    // Log activity
    await activityLogService.createLog({
      type: 'SETTINGS',
      action: 'EVENT_TYPE_CREATED',
      performedBy: {
        userId: req.authenticatedUser?.userId,
        name: req.authenticatedUser?.name,
        role: req.authenticatedUser?.role
      },
      targetResource: {
        type: 'event_type_definitions',
        id: String(eventType.type_id)
      },
      description: `Created event type: ${type_label} (${type_code})`,
      metadata: {
        type_code,
        type_label,
        timestamp: new Date().toISOString()
      }
    });
    
    res.status(201).json({
      success: true,
      message: 'Event type created',
      data: { eventType }
    });
  } catch (error) {
    console.error('[SystemSettings] Error creating event type:', error);
    
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({
        success: false,
        message: 'Event type code already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to create event type'
    });
  }
}

/**
 * Update event type
 */
async function updateEventType(req, res) {
  try {
    const { typeId } = req.params;
    const updates = req.body;
    
    // Ensure numeric fields parsed
    if (updates.points_per_participation !== undefined) {
      updates.points_per_participation = Number(updates.points_per_participation) || 0;
    }

    const eventType = await systemSettingsRepository.updateEventType(parseInt(typeId), updates);
    
    if (!eventType) {
      return res.status(404).json({
        success: false,
        message: 'Event type not found'
      });
    }
    
    // Log activity
    await activityLogService.createLog({
      type: 'SETTINGS',
      action: 'EVENT_TYPE_UPDATED',
      performedBy: {
        userId: req.authenticatedUser?.userId,
        name: req.authenticatedUser?.name,
        role: req.authenticatedUser?.role
      },
      targetResource: {
        type: 'event_type_definitions',
        id: typeId
      },
      description: `Updated event type: ${eventType.type_label}`,
      metadata: {
        type_code: eventType.type_code,
        updates,
        timestamp: new Date().toISOString()
      }
    });
    
    res.json({
      success: true,
      message: 'Event type updated',
      data: { eventType }
    });
  } catch (error) {
    console.error('[SystemSettings] Error updating event type:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update event type'
    });
  }
}

/**
 * Delete event type
 */
async function deleteEventType(req, res) {
  try {
    const { typeId } = req.params;
    
    await systemSettingsRepository.deleteEventType(parseInt(typeId));
    
    // Log activity
    await activityLogService.createLog({
      type: 'SETTINGS',
      action: 'EVENT_TYPE_DELETED',
      performedBy: {
        userId: req.authenticatedUser?.userId,
        name: req.authenticatedUser?.name,
        role: req.authenticatedUser?.role
      },
      targetResource: {
        type: 'event_type_definitions',
        id: typeId
      },
      description: 'Deleted event type',
      metadata: {
        timestamp: new Date().toISOString()
      }
    });
    
    res.json({
      success: true,
      message: 'Event type deleted'
    });
  } catch (error) {
    console.error('[SystemSettings] Error deleting event type:', error);
    
    if (error.message.includes('system')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to delete event type'
    });
  }
}

/**
 * Invalidate settings cache (for testing/debugging)
 */
async function invalidateCache(req, res) {
  try {
    const { category } = req.query;
    systemSettingsRepository.invalidateCache(category || null);
    
    res.json({
      success: true,
      message: category ? `Cache invalidated for ${category}` : 'All cache invalidated'
    });
  } catch (error) {
    console.error('[SystemSettings] Error invalidating cache:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to invalidate cache'
    });
  }
}

module.exports = {
  getAllSettings,
  getSettingsByCategory,
  getSetting,
  updateSetting,
  updateSettingByKey,
  bulkUpdateSettings,
  resetToDefault,
  resetCategoryToDefaults,
  getEventTypes,
  createEventType,
  updateEventType,
  deleteEventType,
  invalidateCache
};
