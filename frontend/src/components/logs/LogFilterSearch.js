"use client";

import { useEffect, useMemo, useState } from "react";
import {
  IoFilterOutline,
  IoRefreshOutline,
  IoSearchOutline,
  IoCloseCircleOutline,
} from "react-icons/io5";

function buildActiveChips(filters, defaults, config) {
  const chips = [];
  config.fields.forEach((field) => {
    if (field.type === "select") {
      const value = filters[field.key];
      const defaultValue = defaults[field.key];
      if (value && value !== "ALL" && value !== defaultValue) {
        const optionLabel = field.options.find(
          (opt) => opt.value === value
        )?.label;
        chips.push({
          key: field.key,
          label: `${field.label}: ${optionLabel || value}`,
        });
      }
    }
    if (field.type === "daterange") {
      const start = filters[field.startKey];
      const end = filters[field.endKey];
      if (start || end) {
        const formatted = [start, end].filter(Boolean).join(" → ");
        chips.push({
          key: `${field.startKey}-${field.endKey}`,
          label: `${field.label}: ${formatted}`,
        });
      }
    }
  });
  if (filters.search && filters.search.trim()) {
    chips.unshift({
      key: "search",
      label: `Search: "${filters.search.trim()}"`,
    });
  }
  return chips;
}

export default function LogFilterSearch({
  filters,
  defaults,
  config,
  onChange,
  onReset,
  activeCount = 0,
  isBusy = false,
}) {
  const [isOpen, setIsOpen] = useState(activeCount > 0);

  useEffect(() => {
    if (activeCount > 0) {
      setIsOpen(true);
    }
  }, [activeCount]);

  const activeChips = useMemo(
    () => buildActiveChips(filters, defaults, config),
    [filters, defaults, config]
  );

  const toggleFilters = () => setIsOpen((prev) => !prev);

  const handleSearchChange = (event) => {
    onChange("search", event.target.value);
  };

  const handleClearSearch = () => {
    onChange("search", "");
  };

  const handleSelectChange = (key) => (event) => {
    onChange(key, event.target.value);
  };

  const handleDateChange = (key) => (event) => {
    onChange(key, event.target.value);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3 shadow-sm">
      <div className="flex flex-col md:flex-row md:flex-wrap md:items-center gap-3">
        <div className="relative flex-1 min-w-[16rem] md:min-w-[20rem]">
          <IoSearchOutline className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={filters.search || ""}
            onChange={handleSearchChange}
            placeholder={config.searchPlaceholder}
            className="w-full min-w-0 pl-10 pr-12 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent transition"
          />
          {filters.search && filters.search.trim() ? (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500"
              aria-label="Clear search"
            >
              <IoCloseCircleOutline className="w-5 h-5" />
            </button>
          ) : null}
          {isBusy ? (
            <span className="absolute right-10 top-1/2 -translate-y-1/2 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-2 flex-wrap md:ml-auto">
          {activeCount > 0 ? (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 transition"
            >
              <IoRefreshOutline className="w-4 h-4" />
              Clear All
            </button>
          ) : null}
          <button
            type="button"
            onClick={toggleFilters}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition"
          >
            <IoFilterOutline className="w-5 h-5" />
            Filters
            {activeCount > 0 ? (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
                {activeCount}
              </span>
            ) : null}
          </button>
        </div>
      </div>

      {activeChips.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {activeChips.map((chip) => (
            <span
              key={chip.key}
              className="inline-flex items-center gap-2 px-3 py-1 text-xs font-medium rounded-full bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300"
            >
              {chip.label}
              <button
                type="button"
                onClick={() => {
                  if (chip.key === "search") {
                    handleClearSearch();
                    return;
                  }
                  const field = config.fields.find((fld) => {
                    if (fld.type === "select") return fld.key === chip.key;
                    if (fld.type === "daterange") {
                      return `${fld.startKey}-${fld.endKey}` === chip.key;
                    }
                    return false;
                  });
                  if (!field) return;
                  if (field.type === "select") {
                    onChange(field.key, defaults[field.key]);
                  } else if (field.type === "daterange") {
                    onChange(field.startKey, defaults[field.startKey] || "");
                    onChange(field.endKey, defaults[field.endKey] || "");
                  }
                }}
                className="text-red-500 hover:text-red-700 dark:text-red-300 dark:hover:text-red-100"
                aria-label="Remove filter"
              >
                <IoCloseCircleOutline className="w-4 h-4" />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      <div
        className={`overflow-hidden transition-[max-height] duration-500 ease-in-out ${
          isOpen ? "max-h-[2000px]" : "max-h-0"
        }`}
        aria-hidden={!isOpen}
      >
        <div
          className={`mt-2 grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 transform transition-all duration-300 origin-top ${
            isOpen
              ? "opacity-100 translate-y-0 scale-100"
              : "opacity-0 -translate-y-2 scale-95"
          }`}
        >
          {config.fields.map((field) => {
            if (field.type === "select") {
              return (
                <div key={field.key} className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {field.label}
                  </label>
                  <select
                    value={filters[field.key] ?? ""}
                    onChange={handleSelectChange(field.key)}
                    className={`w-full px-3 py-2 rounded-lg border bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent transition ${
                      filters[field.key] &&
                      filters[field.key] !== "ALL" &&
                      filters[field.key] !== defaults[field.key]
                        ? "border-red-300 dark:border-red-600"
                        : "border-gray-300 dark:border-gray-600"
                    }`}
                  >
                    {field.options.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {field.helperText ? (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {field.helperText}
                    </p>
                  ) : null}
                </div>
              );
            }

            if (field.type === "daterange") {
              return (
                <div
                  key={`${field.startKey}-${field.endKey}`}
                  className="space-y-2"
                >
                  <span className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {field.label}
                  </span>
                  <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                    <input
                      type="date"
                      value={filters[field.startKey] || ""}
                      onChange={handleDateChange(field.startKey)}
                      className="w-full min-w-0 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent transition"
                    />
                    <span className="text-sm text-gray-400 text-center sm:px-1">
                      to
                    </span>
                    <input
                      type="date"
                      value={filters[field.endKey] || ""}
                      onChange={handleDateChange(field.endKey)}
                      className="w-full min-w-0 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent transition"
                    />
                  </div>
                </div>
              );
            }

            return null;
          })}
        </div>
      </div>
    </div>
  );
}
