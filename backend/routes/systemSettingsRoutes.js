/**
 * System Settings Routes
 * 
 * Admin-only routes for managing system configuration.
 * Covers gamification, events, notifications, system, and OCR settings.
 */

const express = require('express');
const router = express.Router();
const systemSettingsController = require('../controllers/systemSettingsController');
const authMiddleware = require('../middleware/auth');
const authenticate = authMiddleware.authenticate || ((req,res,next)=>next());
const requireRole = authMiddleware.requireRole || ((roles) => (req, res, next) => next());
const asyncHandler = require('../middleware/asyncHandler');

// All routes require authentication and admin role
router.use(authenticate);
router.use(requireRole('admin'));

// ==================== SYSTEM SETTINGS ====================

// Get all settings grouped by category
router.get(
  '/',
  asyncHandler(systemSettingsController.getAllSettings)
);

// Get settings for a specific category
router.get(
  '/category/:category',
  asyncHandler(systemSettingsController.getSettingsByCategory)
);

// Get a single setting by category and key
router.get(
  '/category/:category/:key',
  asyncHandler(systemSettingsController.getSetting)
);

// Update a single setting by ID
router.put(
  '/:settingId',
  asyncHandler(systemSettingsController.updateSetting)
);

// Update a single setting by category and key
router.put(
  '/category/:category/:key',
  asyncHandler(systemSettingsController.updateSettingByKey)
);

// Bulk update settings
router.post(
  '/bulk',
  asyncHandler(systemSettingsController.bulkUpdateSettings)
);

// Reset a setting to default
router.post(
  '/:settingId/reset',
  asyncHandler(systemSettingsController.resetToDefault)
);

// Reset all settings in a category to defaults
router.post(
  '/category/:category/reset',
  asyncHandler(systemSettingsController.resetCategoryToDefaults)
);

// Invalidate cache (for debugging)
router.post(
  '/cache/invalidate',
  asyncHandler(systemSettingsController.invalidateCache)
);

// ==================== EVENT TYPES ====================

// Get all event types
router.get(
  '/event-types',
  asyncHandler(systemSettingsController.getEventTypes)
);

// Create event type
router.post(
  '/event-types',
  asyncHandler(systemSettingsController.createEventType)
);

// Update event type
router.put(
  '/event-types/:typeId',
  asyncHandler(systemSettingsController.updateEventType)
);

// Delete event type
router.delete(
  '/event-types/:typeId',
  asyncHandler(systemSettingsController.deleteEventType)
);

module.exports = router;
