import React, { useState, useEffect } from "react";

/**
 * UserFilterModal - modal-based filter for user lists.
 * Props:
 *   open: boolean (modal visibility)
 *   onClose: () => void
 *   filters: { status, orderBy, nameOrder, dateOrder }
 *   onApply: (filters) => void
 *   onReset: () => void
 *   role: string ('volunteer' | 'staff')
 */
export default function UserFilterModal({
  open,
  onClose,
  filters,
  onApply,
  onReset,
  role,
}) {
  const [localFilters, setLocalFilters] = useState(filters);
  const [orderBy, setOrderBy] = useState(filters.orderBy || "name");
  const [nameOrder, setNameOrder] = useState(filters.nameOrder || "name_asc");
  const [dateOrder, setDateOrder] = useState(filters.dateOrder || "date_desc");

  useEffect(() => {
    if (open) {
      setLocalFilters(filters);
      setOrderBy(filters.orderBy || "name");
      setNameOrder(filters.nameOrder || "name_asc");
      setDateOrder(filters.dateOrder || "date_desc");
    }
  }, [open, filters]);

  // Handle status change
  const handleStatusChange = (e) => {
    setLocalFilters((prev) => ({
      ...prev,
      status: e.target.value,
    }));
  };

  // Handle orderBy dropdown change
  const handleOrderByChange = (e) => {
    const value = e.target.value;
    setOrderBy(value);
    setLocalFilters((prev) => ({
      ...prev,
      orderBy: value,
      nameOrder: value === "name" ? nameOrder : prev.nameOrder,
      dateOrder: value === "date" ? dateOrder : prev.dateOrder,
    }));
  };

  // Handle sort direction change for name
  const handleNameOrderChange = (e) => {
    setNameOrder(e.target.value);
    setLocalFilters((prev) => ({
      ...prev,
      orderBy: "name",
      nameOrder: e.target.value,
    }));
  };

  // Handle sort direction change for date
  const handleDateOrderChange = (e) => {
    setDateOrder(e.target.value);
    setLocalFilters((prev) => ({
      ...prev,
      orderBy: "date",
      dateOrder: e.target.value,
    }));
  };

  // Apply filters and close modal
  const handleApply = () => {
    const appliedFilters = {
      ...localFilters,
      orderBy,
      nameOrder,
      dateOrder,
    };
    onApply(appliedFilters);
    onClose();
  };

  // Reset to defaults and close modal
  const handleReset = () => {
    setLocalFilters({
      status: "",
      orderBy: "date",
      nameOrder: "name_asc",
      dateOrder: "date_desc",
    });
    setOrderBy("date");
    setNameOrder("name_asc");
    setDateOrder("date_desc");
    onReset();
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 transition-opacity">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-xs sm:max-w-sm relative animate-[fadeIn_0.2s_ease]">
        <button
          className="absolute top-3 right-3 text-gray-500 hover:text-black text-2xl"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
        <h2 className="text-lg font-bold text-red-700 mb-4">
          Filter {role ? role.charAt(0).toUpperCase() + role.slice(1) : "Users"}
        </h2>
        {/* Status */}
        <div className="mb-4">
          <div className="font-semibold mb-1">Status</div>
          <div className="flex flex-col gap-1">
            <label>
              <input
                type="radio"
                name="status"
                value=""
                checked={localFilters.status === ""}
                onChange={handleStatusChange}
                className="mr-2"
              />
              All
            </label>
            <label>
              <input
                type="radio"
                name="status"
                value="active"
                checked={localFilters.status === "active"}
                onChange={handleStatusChange}
                className="mr-2"
              />
              Active
            </label>
            <label>
              <input
                type="radio"
                name="status"
                value="inactive"
                checked={localFilters.status === "inactive"}
                onChange={handleStatusChange}
                className="mr-2"
              />
              Inactive
            </label>
          </div>
        </div>
        {/* Order By */}
        <div className="mb-4">
          <div className="font-semibold mb-1">Order By</div>
          <select
            value={orderBy}
            onChange={handleOrderByChange}
            className="border border-gray-300 rounded px-2 py-1 text-sm w-full mb-2"
            aria-label="Order By"
          >
            <option value="name">Name</option>
            <option value="date">Date Added</option>
          </select>
          {/* Conditional Sort Options */}
          {orderBy === "name" && (
            <div className="flex flex-col gap-1 ml-2">
              <label>
                <input
                  type="radio"
                  name="nameOrder"
                  value="name_asc"
                  checked={nameOrder === "name_asc"}
                  onChange={handleNameOrderChange}
                  className="mr-2"
                />
                A–Z
              </label>
              <label>
                <input
                  type="radio"
                  name="nameOrder"
                  value="name_desc"
                  checked={nameOrder === "name_desc"}
                  onChange={handleNameOrderChange}
                  className="mr-2"
                />
                Z–A
              </label>
            </div>
          )}
          {orderBy === "date" && (
            <div className="flex flex-col gap-1 ml-2">
              <label>
                <input
                  type="radio"
                  name="dateOrder"
                  value="date_desc"
                  checked={dateOrder === "date_desc"}
                  onChange={handleDateOrderChange}
                  className="mr-2"
                />
                Newest
              </label>
              <label>
                <input
                  type="radio"
                  name="dateOrder"
                  value="date_asc"
                  checked={dateOrder === "date_asc"}
                  onChange={handleDateOrderChange}
                  className="mr-2"
                />
                Oldest
              </label>
            </div>
          )}
        </div>
        {/* Buttons */}
        <div className="flex justify-end gap-2 mt-4">
          <button
            className="bg-gray-200 text-gray-800 px-3 py-1 rounded hover:bg-gray-300"
            onClick={handleReset}
            type="button"
          >
            Reset
          </button>
          <button
            className="bg-[#bb3031] text-white px-4 py-1 rounded hover:bg-red-800"
            onClick={handleApply}
            type="button"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
