"use client";

import { useId } from "react";

export default function ToggleSwitch({
  checked = false,
  onChange,
  disabled = false,
  label,
  ariaLabel,
  description,
}) {
  const id = useId();
  const descriptionId = description ? `${id}-description` : undefined;

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1">
        {label && (
          <label
            htmlFor={id}
            className="text-sm font-medium text-gray-900 dark:text-white cursor-pointer"
          >
            {label}
          </label>
        )}
        {description && (
          <p
            id={descriptionId}
            className="text-xs text-gray-600 dark:text-gray-400 mt-1"
          >
            {description}
          </p>
        )}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel || label}
        aria-describedby={descriptionId}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`
          relative inline-flex h-6 w-11 items-center rounded-full transition-colors
          focus:outline-none focus:ring-2 focus:ring-[var(--primary-red)] focus:ring-offset-2
          dark:focus:ring-offset-gray-900
          ${
            checked
              ? "bg-[var(--primary-red)]"
              : "bg-gray-200 dark:bg-gray-700"
          }
          ${
            disabled
              ? "opacity-50 cursor-not-allowed"
              : "cursor-pointer hover:opacity-90"
          }
        `}
      >
        <span
          className={`
            inline-block h-4 w-4 transform rounded-full bg-white transition-transform
            ${checked ? "translate-x-6" : "translate-x-1"}
          `}
        />
      </button>
    </div>
  );
}
