/**
 * GamificationSettings Page
 * 
 * Configure gamification rules: points per action, streak settings, level progression.
 */

import { useState, useCallback } from 'react';
import { 
  IoTrophyOutline, 
  IoFlameOutline, 
  IoStarOutline,
  IoRefreshOutline,
  IoWarningOutline 
} from 'react-icons/io5';
import { useSystemSettings } from './useSystemSettings';
import SettingControl from './SettingControl';
import ConfirmModal from '../../ui/ConfirmModal';
import AchievementMappingList from './AchievementMappingList';

import AchievementList from './AchievementList';
import Button from '../../ui/Button';

export default function GamificationSettings({ refreshGamification }) {
  const { 
    settings, 
    loading, 
    error, 
    saving,
    updateSetting,
    resetToDefault,
    resetCategoryToDefaults 
  } = useSystemSettings('gamification');
  
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetError, setResetError] = useState(null);

  // Wrapper for updateSetting that refreshes gamification data after successful updates
  const handleUpdateSetting = useCallback(async (settingId, value) => {
    try {
      const result = await updateSetting(settingId, value);
      // Refresh gamification data to reflect new settings
      if (refreshGamification) {
        await refreshGamification();
      }
      return result;
    } catch (error) {
      throw error;
    }
  }, [updateSetting, refreshGamification]);

  // Group settings by section
  const pointsSettings = settings.filter(s => s.key.includes('points'));
  const streakSettings = settings.filter(s => s.key.includes('streak'));
  const otherSettings = settings.filter(s => 
    !s.key.includes('points') && !s.key.includes('streak')
  );

  const handleResetAll = async () => {
    try {
      setResetError(null);
      await resetCategoryToDefaults('gamification');
      // Refresh gamification data to reflect reset settings
      if (refreshGamification) {
        await refreshGamification();
      }
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
            Configure points, levels, and streak mechanics for volunteers.
          </p>
        </div>
        <Button variant="secondary" icon={IoRefreshOutline} onClick={() => setShowResetConfirm(true)}>Reset All to Defaults</Button>
      </div>

      {/* Points per Action Section */}
      <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border 
                          border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <IoTrophyOutline className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Points per Action
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Points awarded or deducted for volunteer activities
              </p>
            </div>
          </div>
        </div>
        <div className="px-6">
          {pointsSettings.map((setting) => (
            <SettingControl
              key={setting.setting_id}
              setting={setting}
              onUpdate={handleUpdateSetting}
              onReset={resetToDefault}
              saving={saving}
            />
          ))}
          {pointsSettings.length === 0 && (
            <p className="py-4 text-sm text-gray-500 dark:text-gray-400">
              No points settings found.
            </p>
          )}
        </div>
      </section>

      {/* Streak Configuration Section */}
      <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border 
                          border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
              <IoFlameOutline className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Streak Configuration
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Settings for activity streak tracking and bonuses
              </p>
            </div>
          </div>
        </div>
        <div className="px-6">
          {streakSettings.map((setting) => (
            <SettingControl
              key={setting.setting_id}
              setting={setting}
              onUpdate={handleUpdateSetting}
              onReset={resetToDefault}
              saving={saving}
            />
          ))}
          {streakSettings.length === 0 && (
            <p className="py-4 text-sm text-gray-500 dark:text-gray-400">
              No streak settings found.
            </p>
          )}
        </div>
      </section>

      {/* Other Settings Section */}
      {otherSettings.length > 0 && (
        <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border 
                            border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <IoStarOutline className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Level &amp; Badge Settings
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Configure leveling progression and badge system
                </p>
              </div>
            </div>
          </div>
          <div className="px-6">
            {otherSettings.length > 0 ? (
              otherSettings.map((setting) => (
                <SettingControl
                  key={setting.setting_id}
                  setting={setting}
                  onUpdate={handleUpdateSetting}
                  onReset={resetToDefault}
                  saving={saving}
                />
              ))
            ) : (
              <p className="py-4 text-sm text-gray-500 dark:text-gray-400">No level & badge settings found.</p>
            )}

            {/* If badges are disabled, show an informational banner and hide the achievement list */}
            {(() => {
              const eb = otherSettings.find(s => s.key === 'enable_badges');
              const disabled = eb ? (eb.parsedValue === false) : false;
              if (disabled) {
                return (
                  <div className="border-t border-gray-200 dark:border-gray-700 py-6">
                    <div className="rounded-lg bg-yellow-50 dark:bg-yellow-900/20 p-4 flex items-start gap-3">
                      <IoWarningOutline className="w-6 h-6 text-yellow-600" />
                      <div>
                        <p className="font-medium text-sm text-yellow-800 dark:text-yellow-200">Badges are currently disabled</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">The global &quot;Enable Badges&quot; setting is turned off. All achievements have been deactivated and badge awarding is paused.</p>
                      </div>
                    </div>
                  </div>
                );
              }
              return (
                <>
                  <div className="border-t border-gray-200 dark:border-gray-700 py-6">
                    <AchievementMappingList />
                  </div>

                  <div className="border-t border-gray-200 dark:border-gray-700 py-6">
                    <AchievementList />
                  </div>
                </>
              );
            })()}
          </div>
        </section>
      )}

      {/* Reset Confirmation Modal */}
      <ConfirmModal
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={handleResetAll}
        title="Reset Gamification Settings"
        message="Are you sure you want to reset all gamification settings to their default values? This action cannot be undone."
        confirmText="Reset All"
        confirmStyle="danger"
        error={resetError}
      />
    </div>
  );
}
