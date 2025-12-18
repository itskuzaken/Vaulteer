/**
 * SystemSettings Page
 * 
 * Configure core system settings: maintenance mode, registration, defaults.
 */

import { useState } from 'react';
import { 
  IoServerOutline, 
  IoShieldCheckmarkOutline, 
  IoPersonAddOutline,
  IoRefreshOutline,
  IoWarningOutline,
  IoAlertCircleOutline
} from 'react-icons/io5';
import { useSystemSettings } from './useSystemSettings';
import SettingControl from './SettingControl';
import ConfirmModal from '../../ui/ConfirmModal';
import Button from '../../ui/Button';

export default function SystemSettings() {
  const { 
    settings, 
    loading, 
    error, 
    saving,
    updateSetting,
    updateSettingByKey,
    resetToDefault,
    resetCategoryToDefaults,
    refetch 
  } = useSystemSettings('system');
  
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetError, setResetError] = useState(null);

  // Group settings
  const maintenanceSettings = settings.filter(s => s.key.includes('maintenance'));
  const registrationSettings = settings.filter(s => 
    s.key.includes('registration') || s.key.includes('default_user')
  );
  const securitySettings = settings.filter(s => 
    s.key.includes('session') || s.key.includes('allow')
  ).filter(s => !s.key.includes('registration'));

  // User lifecycle / inactivity settings
  const userInactivitySettings = settings.filter(s => s.key.includes('inactive') || s.key.includes('deactivate'));

  // Computed helper: determine if auto-deactivate is explicitly enabled/disabled
  const enableSetting = settings.find(s => s.key === 'enable_auto_deactivate');
  const isAutoDeactivateEnabled = enableSetting ? enableSetting.parsedValue === true : null;

  // Check if maintenance mode is enabled
  const isMaintenanceEnabled = settings.find(s => s.key === 'maintenance_mode')?.parsedValue === true;

  const handleResetAll = async () => {
    try {
      setResetError(null);
      await resetCategoryToDefaults('system');
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
            Core system configuration and maintenance options.
          </p>
        </div>
        <Button variant="secondary" icon={IoRefreshOutline} onClick={() => setShowResetConfirm(true)}>Reset All to Defaults</Button>
      </div>

      {/* Maintenance Mode Warning */}
      {isMaintenanceEnabled && (
        <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 
                        dark:border-amber-800 p-4">
          <div className="flex items-start gap-3">
            <IoAlertCircleOutline className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-amber-800 dark:text-amber-200">
                Maintenance Mode Active
              </h3>
              <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                The system is currently in maintenance mode. Users will see the maintenance 
                message and have limited access. Disable maintenance mode when ready.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Maintenance Section */}
      <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border 
                          border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <IoServerOutline className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Maintenance

              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Control system availability and maintenance messaging
              </p>
            </div>
          </div>
        </div>
        <div className="px-6">
          {maintenanceSettings.map((setting) => (
            <SettingControl
              key={setting.setting_id}
              setting={setting}
              onUpdate={updateSetting}
              onReset={resetToDefault}
              saving={saving}
            />
          ))}
          {maintenanceSettings.length === 0 && (
            <p className="py-4 text-sm text-gray-500 dark:text-gray-400">
              No maintenance settings found.
            </p>
          )}
        </div>
      </section>

      {/* Registration Section */}
      <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border 
                          border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
              <IoPersonAddOutline className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                User Registration
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Configure new user registration behavior
              </p>
            </div>
          </div>
        </div>
        <div className="px-6">
          {registrationSettings.map((setting) => (
            <SettingControl
              key={setting.setting_id}
              setting={setting}
              onUpdate={updateSetting}
              onReset={resetToDefault}
              saving={saving}
            />
          ))}
          {registrationSettings.length === 0 && (
            <p className="py-4 text-sm text-gray-500 dark:text-gray-400">
              No registration settings found.
            </p>
          )}
        </div>
      </section>

      {/* Security Section */}
      {securitySettings.length > 0 && (
        <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border 
                            border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <IoShieldCheckmarkOutline className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Security
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Session and access control settings
                </p>
              </div>
            </div>
          </div>
          <div className="px-6">
            {securitySettings.map((setting) => (
              <SettingControl
                key={setting.setting_id}
                setting={setting}
                onUpdate={updateSetting}
                onReset={resetToDefault}
                saving={saving}
              />
            ))}
          </div>
        </section>
      )}

      {/* User Inactivity Section */}
      <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border 
                          border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
              <IoWarningOutline className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                User Inactivity
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Configure automatic deactivation of inactive accounts
              </p>
            </div>
          </div>
        </div>
        <div className="px-6 space-y-4">
            {/* Toggle */}
            {(() => {
              if (enableSetting) {
                return (
                  <>
                    <SettingControl
                      key={enableSetting.setting_id}
                      setting={enableSetting}
                      onUpdate={updateSetting}
                      onReset={resetToDefault}
                      saving={saving}
                    />
                    {isAutoDeactivateEnabled ? (
                      <p className="mt-2 text-sm text-green-600 dark:text-green-300">Auto inactivation is enabled.</p>
                    ) : (
                      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Enable Auto Inactivation to apply the inactivity rule.</p>
                    )}
                  </>
                );
              }

              // Virtual toggle if missing
              const virtualEnable = {
                setting_id: 'virtual-enable-auto-deactivate',
                key: 'enable_auto_deactivate',
                value: 'true',
                data_type: 'boolean',
                description: 'Automatically mark users as inactive after a configured period',
                default_value: 'true',
                validation_rules: null,
                is_editable: 1
              };

              return (
                <SettingControl
                  key={virtualEnable.setting_id}
                  setting={virtualEnable}
                  onUpdate={async (_id, value) => {
                    await updateSettingByKey('system', 'enable_auto_deactivate', value);
                    await refetch();
                  }}
                  onReset={resetToDefault}
                  saving={saving}
                />
              );
            })()}

            {/* Inactivity days */}
            {(() => {
              const inactive = settings.find(s => s.key === 'inactive_after_days');
              const unit = settings.find(s => s.key === 'inactive_after_unit');

              if (inactive) {
                return (
                  <>
                    <SettingControl
                      key={inactive.setting_id}
                      setting={inactive}
                      onUpdate={updateSetting}
                      onReset={resetToDefault}
                      saving={saving}
                      disabled={isAutoDeactivateEnabled === false}
                    />
                    {/* Unit selector */}
                    {unit ? (
                      <SettingControl
                        key={unit.setting_id}
                        setting={unit}
                        onUpdate={updateSetting}
                        onReset={resetToDefault}
                        saving={saving}
                        disabled={isAutoDeactivateEnabled === false}
                      />
                    ) : (
                      <SettingControl
                        key={'virtual-inactive-after-unit'}
                        setting={{
                          setting_id: 'virtual-inactive-after-unit',
                          key: 'inactive_after_unit',
                          value: 'days',
                          data_type: 'enum',
                          description: 'Unit for inactivity period (days/weeks/months)',
                          default_value: 'days',
                          validation_rules: { allowedValues: ['days', 'weeks', 'months'] },
                          is_editable: 1
                        }}
                        onUpdate={async (_id, value) => {
                          await updateSettingByKey('system', 'inactive_after_unit', value);
                          await refetch();
                        }}
                        onReset={resetToDefault}
                        saving={saving}
                        disabled={isAutoDeactivateEnabled === false}
                      />
                    )}
                  </>
                );
              }

              const virtualSetting = {
                setting_id: 'virtual-inactive-after-days',
                key: 'inactive_after_days',
                value: '14',
                data_type: 'number',
                description: 'Number of units before a user is automatically marked inactive',
                default_value: '14',
                validation_rules: { min: 1, max: 3650 },
                is_editable: 1
              };

              return (
                <>
                  <SettingControl
                    key={virtualSetting.setting_id}
                    setting={virtualSetting}
                    onUpdate={async (_id, value) => {
                      await updateSettingByKey('system', 'inactive_after_days', value);
                      await refetch();
                    }}
                    onReset={resetToDefault}
                    saving={saving}
                    disabled={isAutoDeactivateEnabled === false}
                  />
                  <SettingControl
                    key={'virtual-inactive-after-unit'}
                    setting={{
                      setting_id: 'virtual-inactive-after-unit',
                      key: 'inactive_after_unit',
                      value: 'days',
                      data_type: 'enum',
                      description: 'Unit for inactivity period (days/weeks/months)',
                      default_value: 'days',
                      validation_rules: { allowedValues: ['days', 'weeks', 'months'] },
                      is_editable: 1
                    }}
                    onUpdate={async (_id, value) => {
                      await updateSettingByKey('system', 'inactive_after_unit', value);
                      await refetch();
                    }}
                    onReset={resetToDefault}
                    saving={saving}
                    disabled={isAutoDeactivateEnabled === false}
                  />
                </>
              );
            })()}
        </div>
      </section>

      {/* Reset Confirmation Modal */}
      <ConfirmModal
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={handleResetAll}
        title="Reset System Settings"
        message="Are you sure you want to reset all system settings to their default values? This includes maintenance mode settings."
        confirmText="Reset All"
        confirmStyle="danger"
        error={resetError}
      />
    </div>
  );
}
