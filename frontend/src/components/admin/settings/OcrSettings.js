/**
 * OcrSettings Page
 * 
 * Configure OCR extraction settings for HTS forms.
 */

import { useState } from 'react';
import { 
  IoScanOutline, 
  IoSpeedometerOutline, 
  IoCheckmarkCircleOutline,
  IoRefreshOutline,
  IoWarningOutline,
  IoInformationCircleOutline
} from 'react-icons/io5';
import { useSystemSettings } from './useSystemSettings';
import SettingControl from './SettingControl';
import ConfirmModal from '../../ui/ConfirmModal';
import Button from '../../ui/Button';

export default function OcrSettings() {
  const { 
    settings, 
    loading, 
    error, 
    saving,
    updateSetting,
    resetToDefault,
    resetCategoryToDefaults 
  } = useSystemSettings('ocr');
  
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetError, setResetError] = useState(null);

  // Group settings
  const modeSettings = settings.filter(s => 
    s.key.includes('mode') || s.key.includes('extraction')
  );
  const confidenceSettings = settings.filter(s => s.key.includes('confidence') || s.key.includes('threshold'));
  const featureSettings = settings.filter(s => s.key.includes('enable_') || s.key.includes('validation'));

  const handleResetAll = async () => {
    try {
      setResetError(null);
      await resetCategoryToDefaults('ocr');
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
            Configure AWS Textract OCR extraction for HTS forms.
          </p>
        </div>
        <Button variant="secondary" icon={IoRefreshOutline} onClick={() => setShowResetConfirm(true)}>Reset All to Defaults</Button>
      </div>

      {/* Info Banner */}
      <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 
                      dark:border-blue-800 p-4">
        <div className="flex items-start gap-3">
          <IoInformationCircleOutline className="w-6 h-6 text-blue-500 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-800 dark:text-blue-200">
              Advanced Settings
            </h3>
            <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
              These settings affect the accuracy and performance of HTS form OCR extraction. 
              Changes take effect immediately for new form scans. Adjusting confidence thresholds 
              too low may reduce accuracy, while setting them too high may require more manual review.
            </p>
          </div>
        </div>
      </div>

      {/* Extraction Mode Section */}
      <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border 
                          border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <IoScanOutline className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Extraction Mode
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Choose the OCR extraction method
              </p>
            </div>
          </div>
        </div>
        <div className="px-6">
          {modeSettings.map((setting) => (
            <SettingControl
              key={setting.setting_id}
              setting={setting}
              onUpdate={updateSetting}
              onReset={resetToDefault}
              saving={saving}
            />
          ))}
          {modeSettings.length === 0 && (
            <p className="py-4 text-sm text-gray-500 dark:text-gray-400">
              No extraction mode settings found.
            </p>
          )}
        </div>
      </section>

      {/* Confidence Thresholds Section */}
      <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border 
                          border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <IoSpeedometerOutline className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Confidence Thresholds
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Minimum confidence levels for OCR results (0-100)
              </p>
            </div>
          </div>
        </div>
        <div className="px-6">
          {confidenceSettings.map((setting) => (
            <SettingControl
              key={setting.setting_id}
              setting={setting}
              onUpdate={updateSetting}
              onReset={resetToDefault}
              saving={saving}
            />
          ))}
          {confidenceSettings.length === 0 && (
            <p className="py-4 text-sm text-gray-500 dark:text-gray-400">
              No confidence settings found.
            </p>
          )}
        </div>
      </section>

      {/* Feature Flags Section */}
      <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border 
                          border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
              <IoCheckmarkCircleOutline className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Feature Flags
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Enable or disable OCR features
              </p>
            </div>
          </div>
        </div>
        <div className="px-6">
          {featureSettings.map((setting) => (
            <SettingControl
              key={setting.setting_id}
              setting={setting}
              onUpdate={updateSetting}
              onReset={resetToDefault}
              saving={saving}
            />
          ))}
          {featureSettings.length === 0 && (
            <p className="py-4 text-sm text-gray-500 dark:text-gray-400">
              No feature settings found.
            </p>
          )}
        </div>
      </section>

      {/* Reset Confirmation Modal */}
      <ConfirmModal
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={handleResetAll}
        title="Reset OCR Settings"
        message="Are you sure you want to reset all OCR settings to their default values? This may affect form extraction accuracy."
        confirmText="Reset All"
        confirmStyle="danger"
        error={resetError}
      />
    </div>
  );
}
