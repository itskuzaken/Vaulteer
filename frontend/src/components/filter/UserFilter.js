import React, { useState } from "react";
import UserFilterModal from "../modals/UserFilterModal";

/**
 * ResponsiveFilterButton - same as in ViewAllStaff
 */
function ResponsiveFilterButton({ onClick, isActive }) {
  return (
    <button
      className={`p-2 bg-white border border-[#bb3031] text-[#bb3031] rounded hover:bg-[#bb3031] hover:text-white transition flex items-center focus:outline-none focus:ring-2 focus:ring-[#bb3031]`}
      onClick={onClick}
      aria-label="Open filter"
      type="button"
      style={{
        boxShadow:
          "0 1px 2px rgba(187,48,49,0.08), 0 1.5px 6px rgba(187,48,49,0.08)",
        width: 40,
        height: 40,
        minWidth: 40,
        minHeight: 40,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        outline: isActive ? "2px solid #bb3031" : undefined,
      }}
      tabIndex={0}
    >
      <svg
        className="w-5 h-5 md:w-6 md:h-6"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        viewBox="0 0 24 24"
      >
        <path
          d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707l-6.414 6.414A1 1 0 0013 13.414V19a1 1 0 01-1.447.894l-4-2A1 1 0 017 17v-3.586a1 1 0 00-.293-.707L3.293 6.707A1 1 0 013 6V4z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

/**
 * UserFilter - role-aware filter trigger component.
 * Props:
 *   filters: { status, orderBy, nameOrder, dateOrder }
 *   onChange: (newFilters) => void
 *   role: string ('volunteer' | 'staff')
 *   className: string (optional)
 */
export default function UserFilter({
  filters,
  onChange,
  role,
  className = "",
}) {
  const [modalOpen, setModalOpen] = useState(false);

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
      <ResponsiveFilterButton
        onClick={() => setModalOpen(true)}
        isActive={modalOpen}
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
