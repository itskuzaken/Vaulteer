import React from "react";

/**
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {Object} props.volunteer
 * @param {Function} props.onCancel
 * @param {Function} props.onDelete
 */
export default function DeleteVolunteerModal({
  isOpen,
  volunteer,
  onCancel,
  onDelete,
}) {
  if (!isOpen || !volunteer) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-sm w-full">
        <h2 className="text-xl font-bold mb-4 text-red-700">
          Confirm Deletion
        </h2>
        <p className="mb-6">
          Are you sure you want to delete{" "}
          <span className="font-semibold">{volunteer.name}</span>?
        </p>
        <div className="flex justify-end gap-3">
          <button
            className="px-4 py-2 rounded bg-gray-300 text-gray-800 font-semibold"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 rounded bg-red-700 text-white font-semibold"
            onClick={onDelete}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
