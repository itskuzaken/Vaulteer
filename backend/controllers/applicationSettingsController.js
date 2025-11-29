const applicationSettingsRepository = require('../repositories/applicationSettingsRepository');
const activityLogService = require('../services/activityLogService');

/**
 * Get current application settings (public endpoint)
 */
async function getSettings(req, res) {
  try {
    const settings = await applicationSettingsRepository.getSettings();
    
    if (!settings) {
      return res.status(404).json({ 
        success: false, 
        message: 'Application settings not found' 
      });
    }
    
    // Return public-safe data
    res.json({
      success: true,
      data: {
        is_open: settings.is_open,
        deadline: settings.deadline,
        updated_at: settings.updated_at
      }
    });
  } catch (error) {
    console.error('[ApplicationSettings] Error fetching settings:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch application settings' 
    });
  }
}

/**
 * Open applications with optional deadline (admin/staff only)
 */
async function openApplications(req, res) {
  try {
    const { deadline } = req.body;
    const userId = req.firebaseUid;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'User not authenticated' 
      });
    }
    
    // Validate deadline if provided
    if (deadline) {
      const deadlineDate = new Date(deadline);
      if (isNaN(deadlineDate.getTime())) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid deadline format' 
        });
      }
      
      if (deadlineDate <= new Date()) {
        return res.status(400).json({ 
          success: false, 
          message: 'Deadline must be in the future' 
        });
      }
    }
    
    const settings = await applicationSettingsRepository.openApplications(
      deadline || null,
      userId
    );
    
    // Log activity
    await activityLogService.logActivity({
      user_uid: userId,
      action_type: 'APPLICATION_OPENED',
      action_category: 'application_management',
      target_type: 'application_settings',
      target_id: settings.id.toString(),
      metadata: JSON.stringify({
        deadline: deadline || null,
        timestamp: new Date().toISOString()
      })
    });
    
    res.json({
      success: true,
      message: 'Applications opened successfully',
      data: settings
    });
  } catch (error) {
    console.error('[ApplicationSettings] Error opening applications:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to open applications' 
    });
  }
}

/**
 * Close applications (admin/staff only)
 */
async function closeApplications(req, res) {
  try {
    const userId = req.firebaseUid;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'User not authenticated' 
      });
    }
    
    const settings = await applicationSettingsRepository.closeApplications(
      userId,
      false // Manual close
    );
    
    // Log activity
    await activityLogService.logActivity({
      user_uid: userId,
      action_type: 'APPLICATION_CLOSED',
      action_category: 'application_management',
      target_type: 'application_settings',
      target_id: settings.id.toString(),
      metadata: JSON.stringify({
        manual: true,
        timestamp: new Date().toISOString()
      })
    });
    
    res.json({
      success: true,
      message: 'Applications closed successfully',
      data: settings
    });
  } catch (error) {
    console.error('[ApplicationSettings] Error closing applications:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to close applications' 
    });
  }
}

/**
 * Update deadline (admin/staff only)
 */
async function updateDeadline(req, res) {
  try {
    const { deadline } = req.body;
    const userId = req.firebaseUid;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'User not authenticated' 
      });
    }
    
    const currentSettings = await applicationSettingsRepository.getSettings();
    
    if (!currentSettings.is_open) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot update deadline when applications are closed' 
      });
    }
    
    // Validate deadline
    if (deadline) {
      const deadlineDate = new Date(deadline);
      if (isNaN(deadlineDate.getTime())) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid deadline format' 
        });
      }
      
      if (deadlineDate <= new Date()) {
        return res.status(400).json({ 
          success: false, 
          message: 'Deadline must be in the future' 
        });
      }
    }
    
    const settings = await applicationSettingsRepository.updateSettings({
      is_open: currentSettings.is_open,
      deadline: deadline || null,
      opened_by: currentSettings.opened_by,
      closed_by: currentSettings.closed_by,
      auto_closed: currentSettings.auto_closed
    });
    
    // Log activity
    await activityLogService.logActivity({
      user_uid: userId,
      action_type: 'DEADLINE_UPDATED',
      action_category: 'application_management',
      target_type: 'application_settings',
      target_id: settings.id.toString(),
      metadata: JSON.stringify({
        old_deadline: currentSettings.deadline,
        new_deadline: deadline || null,
        timestamp: new Date().toISOString()
      })
    });
    
    res.json({
      success: true,
      message: 'Deadline updated successfully',
      data: settings
    });
  } catch (error) {
    console.error('[ApplicationSettings] Error updating deadline:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update deadline' 
    });
  }
}

module.exports = {
  getSettings,
  openApplications,
  closeApplications,
  updateDeadline
};
