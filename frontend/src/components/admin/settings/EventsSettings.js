/**
 * EventsSettings Page
 * 
 * Configure event defaults, auto-actions, and custom event types.
 */

import { useState, useCallback } from 'react';
import { 
  IoCalendarOutline, 
  IoSettingsOutline, 
  IoAddCircleOutline,
  IoRefreshOutline,
  IoWarningOutline,
  IoTrashOutline,
  IoCreateOutline,
  IoColorPaletteOutline
} from 'react-icons/io5';
import { useSystemSettings, useEventTypes } from './useSystemSettings';
import SettingControl from './SettingControl';
import ConfirmModal from '../../ui/ConfirmModal';
import Button from '../../ui/Button';

export default function EventsSettings() {
  const { 
    settings, 
    loading, 
    error, 
    saving,
    updateSetting,
    updateSettingByKey,
    resetToDefault,
    resetCategoryToDefaults 
  } = useSystemSettings('events');
  
  const {
    types: eventTypes,
    loading: typesLoading,
    createEventType,
    updateEventType,
    deleteEventType,
    saving: typesSaving
  } = useEventTypes();
  
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showAddTypeModal, setShowAddTypeModal] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [deleteTypeId, setDeleteTypeId] = useState(null);
  const [typeForm, setTypeForm] = useState({
    type_code: '',
    type_label: '',
    description: '',
    icon: '',
    color: '#3B82F6',
    points_per_participation: 0
  });
  const [typeError, setTypeError] = useState(null);
  const [resetError, setResetError] = useState(null);

  // Wrapper for updateSetting that refreshes events data after successful updates
  const handleUpdateSetting = useCallback(async (settingId, value) => {
    try {
      const result = await updateSetting(settingId, value);
      // Note: Events settings changes may require individual component refreshes
      // as there's no centralized events refresh function in the dashboard
      return result;
    } catch (error) {
      throw error;
    }
  }, [updateSetting]);

  // Group settings
  const defaultSettings = settings.filter(s => 
    s.key.includes('default') || s.key.includes('min_') || s.key.includes('max_')
  );
  // Attendance timing keys to surface in the UI even if not in the default grouping
  const attendanceCheckinSetting = settings.find((s) => s.key === 'attendance_checkin_window_mins');
  const attendanceGraceSetting = settings.find((s) => s.key === 'attendance_grace_mins');
  const autoSettings = settings.filter(s => s.key.includes('auto_'));
  const otherSettings = settings.filter(s => 
    !s.key.includes('default') && !s.key.includes('auto_') && 
    !s.key.includes('min_') && !s.key.includes('max_')
  );

  const handleResetAll = async () => {
    try {
      setResetError(null);
      await resetCategoryToDefaults('events');
      // Note: Events settings reset may require individual component refreshes
      setShowResetConfirm(false);
    } catch (err) {
      setResetError(err.message);
    }
  };

  const handleAddType = () => {
    setEditingType(null);
    setTypeForm({
      type_code: '',
      type_label: '',
      description: '',
      icon: '',
      color: '#3B82F6'
    });
    setTypeError(null);
    setShowAddTypeModal(true);
  };

  const handleEditType = (type) => {
    setEditingType(type);
    setTypeForm({
      type_code: type.type_code,
      type_label: type.type_label,
      description: type.description || '',
      icon: type.icon || '',
      color: type.color || '#3B82F6',
      points_per_participation: type.points_per_participation || 0
    });
    setTypeError(null);
    setShowAddTypeModal(true);
  };

  const handleSaveType = async () => {
    try {
      setTypeError(null);
      
      if (!typeForm.type_code || !typeForm.type_label) {
        setTypeError('Code and label are required');
        return;
      }

      if (editingType) {
        await updateEventType(editingType.type_id, {
          type_label: typeForm.type_label,
          description: typeForm.description,
          icon: typeForm.icon,
          color: typeForm.color,
          points_per_participation: Number(typeForm.points_per_participation) || 0
        });
      } else {
        await createEventType(typeForm);
      }
      
      setShowAddTypeModal(false);
    } catch (err) {
      setTypeError(err.message);
    }
  };

  const handleDeleteType = async () => {
    try {
      setTypeError(null);
      await deleteEventType(deleteTypeId);
      setDeleteTypeId(null);
    } catch (err) {
      setTypeError(err.message);
    }
  };

  // Helper to update a setting by key (category 'events')
  const handleUpdateSettingByKey = useCallback(async (key, value) => {
    try {
      await updateSettingByKey('events', key, value);
    } catch (err) {
      throw err;
    }
  }, [updateSettingByKey]);

  // Inline numeric input used when a system setting is not present yet
  function InlineNumberSetting({ keyName, updateByKey, saving }) {
    const [val, setVal] = useState('');
    const [error, setError] = useState(null);

    const save = async () => {
      setError(null);
      const n = Number(val);
      if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
        setError('Enter a non-negative integer');
        return;
      }
      try {
        await updateByKey(keyName, n);
        setVal('');
      } catch (err) {
        setError(err.message || 'Failed to save');
      }
    };

    const placeholder = keyName === 'attendance_checkin_window_mins' ? '15' : keyName === 'attendance_grace_mins' ? '10' : '';

    return (
      <div className="flex items-center gap-3">
        <input
          type="number"
          min={0}
          placeholder={placeholder}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          disabled={saving}
          className="w-24 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-right"
        />
        <button onClick={save} disabled={saving} className="px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50">Save</button>
        {error && <div className="text-sm text-red-600">{error}</div>}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-6 text-center">
        <IoWarningOutline className="w-12 h-12 mx-auto text-red-500 mb-4" />
        <h3 className="text-lg font-medium text-red-800 dark:text-red-200">
          Failed to load settings
        </h3>
        <p className="mt-2 text-sm text-red-600 dark:text-red-300">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Configure event defaults, automation rules, and custom event types.
          </p>
        </div>
        <Button variant="secondary" icon={IoRefreshOutline} onClick={() => setShowResetConfirm(true)}>Reset All to Defaults</Button>
      </div>

      {/* Default Values Section */}
      <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border 
                          border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <IoCalendarOutline className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Default Values
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Default settings applied to new events
              </p>
            </div>
          </div>
        </div>
        <div className="px-6">
          {defaultSettings.map((setting) => (
            <SettingControl
              key={setting.setting_id}
              setting={setting}
              onUpdate={handleUpdateSetting}
              onReset={resetToDefault}
              saving={saving}
            />
          ))}
        </div>
      </section>

      {/* Attendance Timing Defaults */}
      <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border 
                          border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
              <IoSettingsOutline className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Attendance Timing Defaults
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Configure when check-in opens and the grace period for late arrivals.
              </p>
            </div>
          </div>
        </div>
        <div className="px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="py-4 border-b md:border-b-0 border-gray-200 dark:border-gray-700">
              {attendanceCheckinSetting ? (
                <SettingControl
                  key={attendanceCheckinSetting.setting_id}
                  setting={attendanceCheckinSetting}
                  onUpdate={handleUpdateSetting}
                  onReset={resetToDefault}
                  saving={saving}
                />
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">Check-in window (minutes)</h4>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">How many minutes before start does check-in open (default: 15)</p>
                  </div>
                  <InlineNumberSetting keyName="attendance_checkin_window_mins" updateByKey={handleUpdateSettingByKey} saving={saving} />
                </div>
              )}
            </div>

            <div className="py-4">
              {attendanceGraceSetting ? (
                <SettingControl
                  key={attendanceGraceSetting.setting_id}
                  setting={attendanceGraceSetting}
                  onUpdate={handleUpdateSetting}
                  onReset={resetToDefault}
                  saving={saving}
                />
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">Grace period (minutes)</h4>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">How many minutes after start count as late arrivals (default: 10)</p>
                  </div>
                  <InlineNumberSetting keyName="attendance_grace_mins" updateByKey={handleUpdateSettingByKey} saving={saving} />
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            Defaults apply to new events — per-event values (in the event form) take precedence. Use the fields above to update system defaults.
          </div>
        </div>
      </section>

      {/* Auto-Actions Section */}
      <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border 
                          border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
              <IoSettingsOutline className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Automation Rules
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Automatic event lifecycle management
              </p>
            </div>
          </div>
        </div>
        <div className="px-6">
          {autoSettings.map((setting) => (
            <SettingControl
              key={setting.setting_id}
              setting={setting}
              onUpdate={handleUpdateSetting}
              onReset={resetToDefault}
              saving={saving}
            />
          ))}
        </div>
      </section>

            {/* Event Types Section */}
      <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border 
                          border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <IoColorPaletteOutline className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Custom Event Types
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Manage event categories and their appearance
              </p>
            </div>
          </div>
          <Button variant="primary" icon={IoAddCircleOutline} onClick={handleAddType}>Add Type</Button>
        </div>
        <div className="p-6">
          {typesLoading ? (
            <div className="animate-pulse space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {eventTypes.map((type) => (
                <div 
                  key={type.type_id}
                  className="flex items-center justify-between p-4 rounded-lg border
                             border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50"
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: type.color || '#6B7280' }}
                    />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {type.type_label}
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300">
                          {type.points_per_participation || 0} pts
                        </span>
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {type.type_code}
                        {type.is_system ? (
                          <span className="ml-2 text-xs text-gray-400">(system)</span>
                        ) : null}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEditType(type)}
                      className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <IoCreateOutline className="w-5 h-5" />
                    </button>
                    {!type.is_system && (
                      <button
                        onClick={() => setDeleteTypeId(type.type_id)}
                        className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                      >
                        <IoTrashOutline className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Other Settings */}
      {otherSettings.length > 0 && (
        <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border 
                            border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Other Settings
            </h2>
          </div>
          <div className="px-6">
            {otherSettings.map((setting) => (
              <SettingControl
                key={setting.setting_id}
                setting={setting}
                onUpdate={handleUpdateSetting}
                onReset={resetToDefault}
                saving={saving}
              />
            ))}
          </div>
        </section>
      )}

      {/* Add/Edit Type Modal */}
      {showAddTypeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {editingType ? 'Edit Event Type' : 'Add Event Type'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Code
                </label>
                <input
                  type="text"
                  value={typeForm.type_code}
                  onChange={(e) => setTypeForm(prev => ({ 
                    ...prev, 
                    type_code: e.target.value.toLowerCase().replace(/[^a-z_]/g, '') 
                  }))}
                  disabled={!!editingType}
                  placeholder="e.g., workshop"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
                             bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                             disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Label
                </label>
                <input
                  type="text"
                  value={typeForm.type_label}
                  onChange={(e) => setTypeForm(prev => ({ ...prev, type_label: e.target.value }))}
                  placeholder="e.g., Workshop"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
                             bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={typeForm.description}
                  onChange={(e) => setTypeForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
                             bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Points per participation
                </label>
                <input
                  type="number"
                  min={0}
                  value={typeForm.points_per_participation}
                  onChange={(e) => setTypeForm(prev => ({ ...prev, points_per_participation: e.target.value }))}
                  className="w-40 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
                             bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={typeForm.color}
                    onChange={(e) => setTypeForm(prev => ({ ...prev, color: e.target.value }))}
                    className="w-10 h-10 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={typeForm.color}
                    onChange={(e) => setTypeForm(prev => ({ ...prev, color: e.target.value }))}
                    className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
                               bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              {typeError && (
                <p className="text-sm text-red-600 dark:text-red-400">{typeError}</p>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAddTypeModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300
                           hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveType}
                disabled={typesSaving}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg
                           hover:bg-red-700 disabled:opacity-50"
              >
                {typesSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      <ConfirmModal
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={handleResetAll}
        title="Reset Event Settings"
        message="Are you sure you want to reset all event settings to their default values? Custom event types will not be affected."
        confirmText="Reset All"
        confirmStyle="danger"
        error={resetError}
      />

      {/* Delete Type Confirmation */}
      <ConfirmModal
        isOpen={!!deleteTypeId}
        onClose={() => setDeleteTypeId(null)}
        onConfirm={handleDeleteType}
        title="Delete Event Type"
        message="Are you sure you want to delete this event type? Events using this type may be affected."
        confirmText="Delete"
        confirmStyle="danger"
        error={typeError}
      />
    </div>
  );
}
