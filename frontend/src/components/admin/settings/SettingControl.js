/**
 * SettingControl Component
 * 
 * Renders appropriate input control based on setting data type.
 * Supports: number, boolean, string, enum, json
 */

import { useState, useEffect } from 'react';
import { IoRefreshOutline, IoInformationCircleOutline, IoTrashOutline, IoAddCircleOutline } from 'react-icons/io5';
import ToggleSwitch from '../../ui/ToggleSwitch';
import ConfirmModal from '../../ui/ConfirmModal';

export default function SettingControl({
  setting,
  onUpdate,
  onReset,
  saving = false,
  disabled = false,
}) {
  const controlDisabled = saving || disabled;
  const [value, setValue] = useState(setting.value);
  const [error, setError] = useState(null);
  const [isDirty, setIsDirty] = useState(false);

  // Special handling for JSON arrays used for numeric reminder hours
  const [jsonArray, setJsonArray] = useState(null);
  const [newJsonItem, setNewJsonItem] = useState('');
  const [addError, setAddError] = useState(null);
  const [deleteIndex, setDeleteIndex] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Reset local value when setting changes
  useEffect(() => {
    setValue(setting.value);
    setIsDirty(false);
    setError(null);

    // If this is a JSON array setting, parse it into jsonArray for a nicer UI
    if (setting.data_type === 'json' && (setting.key === 'reminder_hours_before' || setting.key.includes('reminder_hours'))) {
      try {
        const parsed = typeof setting.value === 'string' ? JSON.parse(setting.value) : setting.value;
        setJsonArray(Array.isArray(parsed) ? parsed : []);
      } catch (e) {
        setJsonArray([]);
      }
      setNewJsonItem('');
    } else {
      setJsonArray(null);
      setNewJsonItem('');
    }
  }, [setting.value, setting.setting_id, setting.data_type, setting.key]);

  const handleChange = (newValue) => {
    setValue(newValue);
    setIsDirty(newValue !== setting.value);
    setError(null);
  };

  const handleSave = async () => {
    try {
      setError(null);
      await onUpdate(setting.setting_id, value);
      setIsDirty(false);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleReset = async () => {
    try {
      setError(null);
      await onReset(setting.setting_id);
      setIsDirty(false);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && isDirty) {
      handleSave();
    }
  };

  const isModified = setting.value !== setting.default_value;
  const rules = setting.validation_rules || {};

  const renderInput = () => {
    switch (setting.data_type) {
      case 'boolean':
        return (
          <ToggleSwitch
            checked={value === 'true' || value === true}
            onChange={async (checked) => {
              const newVal = String(checked);
              handleChange(newVal);
              try {
                await onUpdate(setting.setting_id, newVal);
              } catch (err) {
                setError(err.message);
                // Revert local value on failure
                setValue(setting.value);
                setIsDirty(false);
              }
            }}
            disabled={controlDisabled}
          />
        );

      case 'number':
        return (
          <div className="flex items-center gap-2 w-full justify-end">
            <input
              type="number"
              value={value}
              onChange={(e) => handleChange(e.target.value)}
              onKeyDown={handleKeyDown}
              min={rules.min}
              max={rules.max}
              disabled={controlDisabled}
              className={`w-24 sm:w-32 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-red-500 focus:border-transparent
                         ${controlDisabled ? 'opacity-50 cursor-not-allowed' : ''} text-right`}
            />
            {isDirty && (
              <button
                onClick={handleSave}
                disabled={controlDisabled}
                className="w-auto px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-lg
                           hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save
              </button>
            )}
          </div>
        );

      case 'enum':
        return (
          <div className="relative w-auto">
            <select
              aria-label={`Select ${formatSettingKey(setting.key)}`}
              value={value}
              onChange={(e) => {
                handleChange(e.target.value);
                onUpdate(setting.setting_id, e.target.value).catch((err) =>
                  setError(err.message)
                );
              }}
              disabled={controlDisabled}
              className="w-full pl-3 pr-8 py-2 rounded-lg border border-gray-300 dark:border-gray-600
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-red-500 focus:border-transparent text-right
                         appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {(rules.allowedValues || []).map((val) => (
                <option key={val} value={val}>
                  {val.charAt(0).toUpperCase() + val.slice(1).replace(/_/g, ' ')}
                </option>
              ))}
            </select>

            <svg className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none w-4 h-4 text-gray-500 dark:text-gray-300" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.936a.75.75 0 111.08 1.04l-4.24 4.5a.75.75 0 01-1.06 0l-4.24-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
            </svg>
          </div>
        );

      case 'json': {
        // Special UI for reminder hours arrays (array of numbers)
        if ((setting.key === 'reminder_hours_before' || setting.key.includes('reminder_hours')) && Array.isArray(jsonArray)) {
          const removeAt = (idx) => {
            const updated = jsonArray.filter((_, i) => i !== idx);
            setJsonArray(updated);
            setIsDirty(JSON.stringify(updated) !== (typeof setting.value === 'string' ? setting.value : JSON.stringify(setting.value)));
          };

          const addItem = () => {
            const trimmed = String(newJsonItem).trim();
            if (trimmed === '') {
              setAddError('Enter an hour to add');
              return;
            }

            const n = Number(trimmed);
            if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
              setAddError('Enter a non-negative integer');
              return;
            }

            if (jsonArray.includes(n)) {
              setAddError('This hour is already added');
              return;
            }

            const updated = [...jsonArray, n];
            setJsonArray(updated);
            setNewJsonItem('');
            setAddError(null);
            setIsDirty(JSON.stringify(updated) !== (typeof setting.value === 'string' ? setting.value : JSON.stringify(setting.value)));
          };

          const saveArray = async () => {
            try {
              setError(null);
              await onUpdate(setting.setting_id, JSON.stringify(jsonArray));
              setIsDirty(false);
            } catch (err) {
              setError(err.message);
            }
          };

          return (
            <div className="w-full sm:w-96 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              {/* Left: list of existing reminder hours (read-only) */}
              <div className="flex-1 space-y-2">
                {jsonArray.length === 0 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No reminder hours configured.</p>
                )}

                {jsonArray.map((num, idx) => (
                  <div key={idx} className="flex items-center gap-2 justify-start">
                    <div className="w-24 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-left font-mono">
                      {num}
                    </div>
                    <button
                      onClick={() => { setDeleteIndex(idx); setShowDeleteConfirm(true); }}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                      title="Remove"
                      aria-label={`Remove reminder hour ${num}`}
                    >
                      <IoTrashOutline className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Right: add new hour */}
              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="Add hour"
                    value={newJsonItem}
                    min={0}
                    step={1}
                    onChange={(e) => { setNewJsonItem(e.target.value); setAddError(null); }}
                    className="w-24 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-right"
                  />
                  <button
                    onClick={addItem}
                    disabled={controlDisabled || newJsonItem === ''}
                    className={`inline-flex items-center justify-center w-9 h-9 text-white bg-red-600 rounded-lg hover:bg-red-700 ${controlDisabled || newJsonItem === '' ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title="Add hour"
                    aria-label="Add reminder hour"
                  >
                    <IoAddCircleOutline className="w-5 h-5" />
                  </button>
                </div>

                {addError && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">{addError}</p>
                )}

                {isDirty && (
                  <button
                    onClick={saveArray}
                    disabled={controlDisabled}
                    className="mt-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    Save
                  </button>
                )}
              </div>
            </div>
          );
        }

        // Fallback to raw JSON editor
        return (
          <div className="space-y-2">
            <textarea
              value={typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
              onChange={(e) => handleChange(e.target.value)}
              disabled={controlDisabled}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm
                         focus:ring-2 focus:ring-red-500 focus:border-transparent
                         disabled:opacity-50 disabled:cursor-not-allowed"
            />
            {isDirty && (
              <button
                onClick={handleSave}
                disabled={controlDisabled}
                className="w-full sm:w-auto px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-lg
                           hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save JSON
              </button>
            )}
          </div>
        );
      }

      case 'string':
      default: {
        const isMultiline = /message|body|text/i.test(setting.key);
        if (isMultiline) {
          return (
            <div className="w-full flex justify-end">
              <div className="w-full sm:w-96">
                <textarea
                  rows={rules.rows || 4}
                  value={value}
                  onChange={(e) => handleChange(e.target.value)}
                  disabled={controlDisabled}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-sans text-sm
                             focus:ring-2 focus:ring-red-500 focus:border-transparent
                             disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              {isDirty && (
                <button
                  onClick={handleSave}
                  disabled={controlDisabled}
                  className="ml-3 w-auto px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-lg
                             hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save
                </button>
              )}
            </div>
          );
        }

        return (
          <div className="flex items-center gap-2 w-full justify-end">
            <input
              type="text"
              value={value}
              onChange={(e) => handleChange(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={rules.maxLength}
              disabled={controlDisabled}
              className="w-40 sm:flex-1 sm:max-w-md px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-right
                         focus:ring-2 focus:ring-red-500 focus:border-transparent
                         disabled:opacity-50 disabled:cursor-not-allowed"
            />
            {isDirty && (
              <button
                onClick={handleSave}
                disabled={controlDisabled}
                className="w-auto px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-lg
                           hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save
              </button>
            )}
          </div>
        );
      }
    }
  };

  return (
    <div className="py-4 border-b border-gray-200 dark:border-gray-700 last:border-0">
      <div className="grid grid-cols-2 items-start gap-4">
        <div className="flex-1 min-w-0 col-span-1">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
              {formatSettingKey(setting.key)}
            </h4>
            {isModified && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
                             bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                Modified
              </span>
            )}
            {setting.description && (
              <div className="group relative">
                <IoInformationCircleOutline className="w-4 h-4 text-gray-400 cursor-help" />
                <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-10">
                  <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 max-w-xs shadow-lg">
                    {setting.description}
                  </div>
                </div>
              </div>
            )}
          </div>
          {setting.description && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 wrap-break-word">
              {setting.description}
            </p>
          )}
          {rules.min !== undefined && rules.max !== undefined && (
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              Range: {rules.min} to {rules.max}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 justify-end w-full sm:w-auto col-span-1">
          {isModified && (
            <button
              onClick={handleReset}
              disabled={controlDisabled}
              title="Reset to default"
              aria-label={`Reset ${formatSettingKey(setting.key)} to default`}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
                         disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              <IoRefreshOutline className="w-5 h-5" />
            </button>
          )}

          <div className="flex justify-end">
            {renderInput()}
          </div>
        </div>
      </div>

      {/* Delete confirmation modal for reminder hours */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => { setShowDeleteConfirm(false); setDeleteIndex(null); }}
        onConfirm={() => {
          if (deleteIndex !== null) {
            removeAt(deleteIndex);
          }
          setShowDeleteConfirm(false);
          setDeleteIndex(null);
        }}
        title="Delete reminder hour"
        message="Are you sure you want to delete this reminder hour?"
        confirmText="Delete"
        confirmStyle="danger"
        error={error}
      />

      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}

// Format setting key for display
function formatSettingKey(key) {
  const labels = {
    enable_auto_deactivate: 'Enable Auto Inactivation',
    inactive_after_days: 'Auto Inactivate After',
    inactive_after_unit: 'Unit (days/weeks/months)'
  };

  if (labels[key]) return labels[key];

  return key
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
