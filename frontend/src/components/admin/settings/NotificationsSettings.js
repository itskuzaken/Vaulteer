/**
 * NotificationsSettings Page
 * 
 * Configure notification preferences and triggers.
 */

import { useState } from 'react';
import { 
  IoNotificationsOutline, 
  IoMailOutline, 
  IoPhonePortraitOutline,
  IoRefreshOutline,
  IoWarningOutline 
} from 'react-icons/io5';
import { useSystemSettings } from './useSystemSettings';
import SettingControl from './SettingControl';
import ConfirmModal from '../../ui/ConfirmModal';
import Button from '../../ui/Button';

export default function NotificationsSettings() {
  const { 
    settings, 
    loading, 
    error, 
    saving,
    updateSetting,
    resetToDefault,
    resetCategoryToDefaults 
  } = useSystemSettings('notifications');
  
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetError, setResetError] = useState(null);

  // Group settings
  const globalSettings = settings.filter(s => 
    s.key.includes('enable_push') || s.key.includes('enable_email')
  );
  const triggerSettings = settings.filter(s => s.key.includes('notify_on'));
  const digestSettings = settings.filter(s => s.key.includes('digest'));

  const handleResetAll = async () => {
    try {
      setResetError(null);
      await resetCategoryToDefaults('notifications');
      setShowResetConfirm(false);
    } catch (err) {
      setResetError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
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
            Configure system-wide notification preferences and triggers.
          </p>
        </div>
        <Button variant="secondary" icon={IoRefreshOutline} onClick={() => setShowResetConfirm(true)}>Reset All to Defaults</Button>
      </div>

      {/* Global Settings Section */}
      <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border 
                          border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <IoNotificationsOutline className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Global Notification Settings
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Enable or disable notification channels system-wide
              </p>
            </div>
          </div>
        </div>
        <div className="px-6">
          {globalSettings.map((setting) => (
            <SettingControl
              key={setting.setting_id}
              setting={setting}
              onUpdate={updateSetting}
              onReset={resetToDefault}
              saving={saving}
            />
          ))}
          {globalSettings.length === 0 && (
            <p className="py-4 text-sm text-gray-500 dark:text-gray-400">
              No global settings found.
            </p>
          )}
        </div>
      </section>

      {/* Notification Triggers Section */}
      <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border 
                          border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
              <IoPhonePortraitOutline className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Notification Triggers
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Choose which events trigger notifications
              </p>
            </div>
          </div>
        </div>
        <div className="px-6">
          {triggerSettings.map((setting) => (
            <SettingControl
              key={setting.setting_id}
              setting={setting}
              onUpdate={updateSetting}
              onReset={resetToDefault}
              saving={saving}
            />
          ))}
          {triggerSettings.length === 0 && (
            <p className="py-4 text-sm text-gray-500 dark:text-gray-400">
              No trigger settings found.
            </p>
          )}
        </div>
      </section>

      {/* Email Digest Section */}
      <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border 
                          border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <IoMailOutline className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Email Digest
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Configure batched email notification settings
              </p>
            </div>
          </div>
        </div>
        <div className="px-6">
          {digestSettings.map((setting) => (
            <SettingControl
              key={setting.setting_id}
              setting={setting}
              onUpdate={updateSetting}
              onReset={resetToDefault}
              saving={saving}
            />
          ))}
          {digestSettings.length === 0 && (
            <p className="py-4 text-sm text-gray-500 dark:text-gray-400">
              No digest settings found.
            </p>
          )}
        </div>
      </section>

      {/* Reset Confirmation Modal */}
      <ConfirmModal
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={handleResetAll}
        title="Reset Notification Settings"
        message="Are you sure you want to reset all notification settings to their default values?"
        confirmText="Reset All"
        confirmStyle="danger"
        error={resetError}
      />
    </div>
  );
}
