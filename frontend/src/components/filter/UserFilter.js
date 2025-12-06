"use client";

import React, { useState } from "react";
import { IoFunnelOutline } from "react-icons/io5";
import UserFilterModal from "../modals/UserFilterModal";

/**
 * Modern Filter Button with smooth animations
 */
function ModernFilterButton({ onClick, isActive, hasActiveFilters }) {
  return (
    <button
      className={`
        relative
        p-2.5
        bg-white dark:bg-gray-800
        border-2 
        ${
          isActive
            ? "border-red-500 dark:border-red-400 bg-red-50 dark:bg-red-900/20"
            : hasActiveFilters
            ? "border-red-500 dark:border-red-400"
            : "border-gray-300 dark:border-gray-600"
        }
        text-gray-700 dark:text-gray-300
        rounded-lg
        transition-all duration-200
        hover:bg-gray-50 dark:hover:bg-gray-700
        hover:border-red-500 dark:hover:border-red-400
        hover:scale-105
        focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400
        flex items-center justify-center
        shadow-sm hover:shadow-md
      `}
      onClick={onClick}
      aria-label="Open filters"
      aria-pressed={isActive}
      type="button"
    >
      <IoFunnelOutline
        size={20}
        className={`transition-colors ${
          isActive ? "text-red-600 dark:text-red-400" : ""
        }`}
      />

      {/* Active filter indicator removed */}
    </button>
  );
}

/**
 * UserFilter - Modern role-aware filter trigger component.
 * Props:
 *   filters: { status, orderBy, nameOrder, dateOrder }
 *   onChange: (newFilters) => void
 *   role: string ('volunteer' | 'staff' | 'applicant')
 *   className: string (optional)
 */
export default function UserFilter({
  filters,
  onChange,
  role,
  className = "",
}) {
  const [modalOpen, setModalOpen] = useState(false);

  // Check if any filters are active
  const hasActiveFilters =
    filters.status !== "" ||
    filters.orderBy !== "date" ||
    filters.nameOrder !== "name_asc" ||
    filters.dateOrder !== "date_desc";

  // Handler for applying filters from modal
  const handleApply = (newFilters) => {
    onChange(newFilters);
    setModalOpen(false);
  };

  // Handler for resetting filters from modal
  const handleReset = () => {
    onChange({
      status: "",
      orderBy: "date",
      nameOrder: "name_asc",
      dateOrder: "date_desc",
    });
    setModalOpen(false);
  };

  return (
    <div className={className}>
      <ModernFilterButton
        onClick={() => setModalOpen(true)}
        isActive={modalOpen}
        hasActiveFilters={hasActiveFilters}
      />
      <UserFilterModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        filters={filters}
        onApply={handleApply}
        onReset={handleReset}
        role={role}
      />
    </div>
  );
}
