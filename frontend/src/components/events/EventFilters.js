"use client";

import { useEffect, useMemo, useState } from "react";
import { IoFunnelOutline, IoCloseOutline } from "react-icons/io5";

const ensureFilterState = (base = {}, locked = {}) => ({
  status: locked.status ?? base.status ?? "",
  event_type: locked.event_type ?? base.event_type ?? "",
  location_type: locked.location_type ?? base.location_type ?? "",
  date_from: locked.date_from ?? base.date_from ?? "",
  date_to: locked.date_to ?? base.date_to ?? "",
  search: locked.search ?? base.search ?? "",
});

export default function EventFilters({
  onFilterChange,
  initialFilters = {},
  lockedFilters = {},
}) {
  const [isOpen, setIsOpen] = useState(false);
  const baselineFilters = useMemo(
    () => ensureFilterState(initialFilters, lockedFilters),
    [initialFilters, lockedFilters]
  );
  const [filters, setFilters] = useState(baselineFilters);

  useEffect(() => {
    setFilters(baselineFilters);
  }, [baselineFilters]);

  const isFieldLocked = (name) =>
    Object.prototype.hasOwnProperty.call(lockedFilters, name);

  const handleFilterChange = (name, value) => {
    if (isFieldLocked(name)) return;
    const newFilters = { ...filters, [name]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleReset = () => {
    const resetFilters = { ...baselineFilters };
    setFilters(resetFilters);
    onFilterChange(resetFilters);
  };

  const activeFilterCount = useMemo(
    () =>
      Object.keys(filters).reduce(
        (count, key) =>
          filters[key] !== baselineFilters[key] ? count + 1 : count,
        0
      ),
    [filters, baselineFilters]
  );
  const hasActiveFilters = activeFilterCount > 0;

  return (
    <div className="mb-6">
      {/* Search Bar and Filter Toggle */}
      <div className="flex gap-3 mb-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search events..."
            value={filters.search}
            onChange={(e) => handleFilterChange("search", e.target.value)}
            disabled={isFieldLocked("search")}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed"
          />
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
            hasActiveFilters
              ? "bg-red-600 text-white border-red-600"
              : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
          }`}
        >
          <IoFunnelOutline className="text-lg" />
          <span>Filters</span>
          {/* Active filter badge removed */}
        </button>
      </div>

      {/* Filter Panel */}
      {isOpen && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Filter Events
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <IoCloseOutline className="text-2xl" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Event Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Event Type
              </label>
              <select
                value={filters.event_type}
                onChange={(e) =>
                  handleFilterChange("event_type", e.target.value)
                }
                disabled={isFieldLocked("event_type")}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <option value="">All Types</option>
                <option value="training">Training</option>
                <option value="community_service">Community Service</option>
                <option value="fundraising">Fundraising</option>
                <option value="meeting">Meeting</option>
                <option value="social">Social</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Location Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Location Type
              </label>
              <select
                value={filters.location_type}
                onChange={(e) =>
                  handleFilterChange("location_type", e.target.value)
                }
                disabled={isFieldLocked("location_type")}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <option value="">All Locations</option>
                <option value="on_site">On-site</option>
                <option value="remote">Remote</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>

            {/* Date From Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                From Date
              </label>
              <input
                type="date"
                value={filters.date_from}
                onChange={(e) =>
                  handleFilterChange("date_from", e.target.value)
                }
                disabled={isFieldLocked("date_from")}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>

            {/* Date To Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                To Date
              </label>
              <input
                type="date"
                value={filters.date_to}
                onChange={(e) => handleFilterChange("date_to", e.target.value)}
                disabled={isFieldLocked("date_to")}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          {/* Reset Button */}
          {hasActiveFilters && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleReset}
                className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
              >
                Reset All Filters
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
