import { API_BASE } from '../config/config';

/**
 * Get current application settings (public endpoint)
 * @returns {Promise<Object>} Settings data
 */
export async function getApplicationSettings() {
  try {
    const response = await fetch(`${API_BASE}/application/settings`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch settings: ${response.statusText}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('[ApplicationSettingsService] Error fetching settings:', error);
    throw error;
  }
}

/**
 * Open applications with optional deadline (admin/staff only)
 * @param {string|null} deadline - ISO datetime string for deadline
 * @param {string} idToken - Firebase ID token
 * @returns {Promise<Object>} Updated settings
 */
export async function openApplications(deadline, idToken) {
  try {
    const response = await fetch(`${API_BASE}/application/settings/open`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`,
      },
      body: JSON.stringify({ deadline }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Failed to open applications: ${response.statusText}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('[ApplicationSettingsService] Error opening applications:', error);
    throw error;
  }
}

/**
 * Close applications (admin/staff only)
 * @param {string} idToken - Firebase ID token
 * @returns {Promise<Object>} Updated settings
 */
export async function closeApplications(idToken) {
  try {
    const response = await fetch(`${API_BASE}/application/settings/close`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Failed to close applications: ${response.statusText}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('[ApplicationSettingsService] Error closing applications:', error);
    throw error;
  }
}

/**
 * Update deadline (admin/staff only)
 * @param {string|null} deadline - ISO datetime string for new deadline
 * @param {string} idToken - Firebase ID token
 * @returns {Promise<Object>} Updated settings
 */
export async function updateDeadline(deadline, idToken) {
  try {
    const response = await fetch(`${API_BASE}/application/settings/deadline`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`,
      },
      body: JSON.stringify({ deadline }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Failed to update deadline: ${response.statusText}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('[ApplicationSettingsService] Error updating deadline:', error);
    throw error;
  }
}
