"use client";

import { useId } from "react";

export default function ToggleSwitch({
  id: propsId,
  checked = false,
  enabled, // backward compatibility
  onChange,
  disabled = false,
  label,
  ariaLabel,
  description,
}) {
  const generatedId = useId();
  const id = propsId || generatedId;
  const descriptionId = description ? `${id}-description` : undefined;

  // Prefer explicit 'enabled' prop for backward compatibility
  const isChecked = typeof enabled !== "undefined" ? Boolean(enabled) : Boolean(checked);

  const toggle = () => {
    if (disabled) return;
    onChange && onChange(!isChecked);
  };

  const handleKeyDown = (e) => {
    if (disabled) return;
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      onChange && onChange(!isChecked);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
      <div className="flex-1 min-w-0">
        {label && (
          <label
            htmlFor={id}
            onClick={() => toggle()}
            className="text-base sm:text-sm font-medium text-gray-900 dark:text-white cursor-pointer block"
          >
            {label}
          </label>
        )}
        {description && (
          <p
            id={descriptionId}
            className="text-sm sm:text-xs text-gray-600 dark:text-gray-400 mt-1 break-words"
          >
            {description}
          </p>
        )}
      </div>

      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={isChecked}
        aria-label={ariaLabel || label}
        aria-describedby={descriptionId}
        disabled={disabled}
        onClick={toggle}
        onKeyDown={handleKeyDown}
        className={`
          relative inline-flex h-6 w-11 sm:h-8 sm:w-14 flex-shrink-0 items-center rounded-full transition-colors
          focus:outline-none focus:ring-2 focus:ring-[var(--primary-red)] focus:ring-offset-2
          dark:focus:ring-offset-gray-900
          touch-manipulation
          ${
            isChecked
              ? "bg-[var(--primary-red)]"
              : "bg-gray-200 dark:bg-gray-700"
          }
          ${
            disabled
              ? "opacity-50 cursor-not-allowed"
              : "cursor-pointer hover:opacity-95 active:scale-95"
          }
        `}
      >
        <span
          className={`
            inline-block h-4 w-4 sm:h-6 sm:w-6 transform rounded-full bg-white shadow-sm transition-transform
            ${isChecked ? "translate-x-6 sm:translate-x-7" : "translate-x-1"}
          `}
          aria-hidden="true"
        />
      </button>
    </div>
  );
}
