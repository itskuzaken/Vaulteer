/**
 * useSystemSettings Hook
 * 
 * Custom hook for fetching and updating system settings.
 * Provides loading states, error handling, and optimistic updates.
 */

import { useState, useEffect, useCallback } from 'react';
import { getAuth } from 'firebase/auth';
import { API_BASE } from '../../../config/config';

export function useSystemSettings(category = null) {
  const [settings, setSettings] = useState([]);
  const [allSettings, setAllSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  // Fetch settings
  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error('Not authenticated');

      const token = await user.getIdToken();
      const endpoint = category 
        ? `${API_BASE}/system-settings/category/${category}`
        : `${API_BASE}/system-settings`;

      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to fetch settings');
      }

      const result = await response.json();
      
      if (category) {
        setSettings(result.data.settings || []);
      } else {
        setAllSettings(result.data.settings || {});
      }
    } catch (err) {
      console.error('[useSystemSettings] Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [category]);

  // Update a single setting
  const updateSetting = useCallback(async (settingId, value) => {
    try {
      setSaving(true);

      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error('Not authenticated');

      const token = await user.getIdToken();

      const response = await fetch(`${API_BASE}/system-settings/${settingId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ value }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to update setting');
      }

      const result = await response.json();
      
      // Update local state
      if (category) {
        setSettings(prev => 
          prev.map(s => s.setting_id === settingId ? result.data.setting : s)
        );
      }

      return result.data.setting;
    } catch (err) {
      console.error('[useSystemSettings] Update error:', err);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [category]);

  // Update setting by category and key
  const updateSettingByKey = useCallback(async (cat, key, value) => {
    try {
      setSaving(true);

      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error('Not authenticated');

      const token = await user.getIdToken();

      const response = await fetch(`${API_BASE}/system-settings/category/${cat}/${key}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ value }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to update setting');
      }

      const result = await response.json();

      // Refresh settings
      await fetchSettings();

      return result.data.setting;
    } catch (err) {
      console.error('[useSystemSettings] Update error:', err);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [fetchSettings]);

  // Bulk update settings
  const bulkUpdate = useCallback(async (updates) => {
    try {
      setSaving(true);

      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error('Not authenticated');

      const token = await user.getIdToken();

      const response = await fetch(`${API_BASE}/system-settings/bulk`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ updates }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to bulk update settings');
      }

      const result = await response.json();

      // Refresh settings
      await fetchSettings();

      return result.data;
    } catch (err) {
      console.error('[useSystemSettings] Bulk update error:', err);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [fetchSettings]);

  // Reset setting to default
  const resetToDefault = useCallback(async (settingId) => {
    try {
      setSaving(true);

      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error('Not authenticated');

      const token = await user.getIdToken();

      const response = await fetch(`${API_BASE}/system-settings/${settingId}/reset`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to reset setting');
      }

      const result = await response.json();

      // Update local state
      if (category) {
        setSettings(prev => 
          prev.map(s => s.setting_id === settingId ? result.data.setting : s)
        );
      }

      return result.data.setting;
    } catch (err) {
      console.error('[useSystemSettings] Reset error:', err);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [category]);

  // Reset category to defaults
  const resetCategoryToDefaults = useCallback(async (cat) => {
    try {
      setSaving(true);

      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error('Not authenticated');

      const token = await user.getIdToken();

      const response = await fetch(`${API_BASE}/system-settings/category/${cat}/reset`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to reset category');
      }

      // Refresh settings
      await fetchSettings();

      return true;
    } catch (err) {
      console.error('[useSystemSettings] Reset category error:', err);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [fetchSettings]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return {
    settings,
    allSettings,
    loading,
    error,
    saving,
    refetch: fetchSettings,
    updateSetting,
    updateSettingByKey,
    bulkUpdate,
    resetToDefault,
    resetCategoryToDefaults,
  };
}

// Hook for event types
export function useEventTypes() {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchEventTypes = useCallback(async (activeOnly = false) => {
    try {
      setLoading(true);
      setError(null);

      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error('Not authenticated');

      const token = await user.getIdToken();

      const response = await fetch(
        `${API_BASE}/system-settings/event-types?activeOnly=${activeOnly}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to fetch event types');
      }

      const result = await response.json();
      setTypes(result.data.types || []);
    } catch (err) {
      console.error('[useEventTypes] Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const createEventType = useCallback(async (data) => {
    try {
      setSaving(true);

      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error('Not authenticated');

      const token = await user.getIdToken();

      const response = await fetch(`${API_BASE}/system-settings/event-types`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const res = await response.json().catch(() => ({}));
        throw new Error(res.message || 'Failed to create event type');
      }

      const result = await response.json();
      await fetchEventTypes(false);
      return result.data.eventType;
    } catch (err) {
      console.error('[useEventTypes] Create error:', err);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [fetchEventTypes]);

  const updateEventType = useCallback(async (typeId, data) => {
    try {
      setSaving(true);

      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error('Not authenticated');

      const token = await user.getIdToken();

      const response = await fetch(`${API_BASE}/system-settings/event-types/${typeId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const res = await response.json().catch(() => ({}));
        throw new Error(res.message || 'Failed to update event type');
      }

      const result = await response.json();
      await fetchEventTypes(false);
      return result.data.eventType;
    } catch (err) {
      console.error('[useEventTypes] Update error:', err);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [fetchEventTypes]);

  const deleteEventType = useCallback(async (typeId) => {
    try {
      setSaving(true);

      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error('Not authenticated');

      const token = await user.getIdToken();

      const response = await fetch(`${API_BASE}/system-settings/event-types/${typeId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const res = await response.json().catch(() => ({}));
        throw new Error(res.message || 'Failed to delete event type');
      }

      await fetchEventTypes(false);
      return true;
    } catch (err) {
      console.error('[useEventTypes] Delete error:', err);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [fetchEventTypes]);

  useEffect(() => {
    fetchEventTypes(false);
  }, [fetchEventTypes]);

  return {
    types,
    loading,
    error,
    saving,
    refetch: fetchEventTypes,
    createEventType,
    updateEventType,
    deleteEventType,
  };
}
