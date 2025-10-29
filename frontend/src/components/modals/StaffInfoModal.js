import React, { useRef, useEffect } from "react";
import DeleteStaffModal from "./DeleteStaffModal";

/**
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {Object} props.staff
 * @param {Object} props.editingStaff
 * @param {Object} props.editForm
 * @param {boolean} props.saving
 * @param {Function} props.onEditClick
 * @param {Function} props.onEditChange
 * @param {Function} props.onEditSave
 * @param {Function} props.onEditCancel
 * @param {Function} props.onDeleteClick
 * @param {Function} props.onClose
 * @param {boolean} props.showDeleteModal
 * @param {Object} props.staffToDelete
 * @param {Function} props.onDeleteCancel
 * @param {Function} props.onDeleteConfirm
 */
export default function StaffInfoModal({
  isOpen,
  staff,
  editingStaff,
  editForm,
  saving,
  onEditClick,
  onEditChange,
  onEditSave,
  onEditCancel,
  onDeleteClick,
  onClose,
  showDeleteModal,
  staffToDelete,
  onDeleteCancel,
  onDeleteConfirm,
}) {
  const modalRef = useRef(null);

  useEffect(() => {
    if (isOpen && modalRef.current) modalRef.current.focus();
  }, [isOpen]);

  if (!isOpen || !staff) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      tabIndex={-1}
      aria-modal="true"
      role="dialog"
    >
      <div
        ref={modalRef}
        className="bg-white rounded-lg shadow-xl p-8 max-w-sm w-full relative outline-none"
        tabIndex={0}
      >
        {/* Delete Modal at the top */}
        <DeleteStaffModal
          isOpen={showDeleteModal}
          staff={staffToDelete}
          onCancel={onDeleteCancel}
          onDelete={onDeleteConfirm}
        />
        <button
          className="absolute top-3 right-3 text-gray-500 hover:text-black text-2xl"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
        <h2 className="text-xl font-bold text-red-700 mb-3">
          Staff Information
        </h2>
        <div className="mb-2">
          <span className="font-semibold">ID: </span>
          <span>{staff.id}</span>
        </div>
        <div className="mb-2">
          <span className="font-semibold">Name: </span>
          {editingStaff && editingStaff.id === staff.id ? (
            <input
              type="text"
              name="name"
              value={editForm.name}
              onChange={onEditChange}
              className="border px-2 py-1 rounded w-full text-sm"
              autoFocus
            />
          ) : (
            <span>{staff.name}</span>
          )}
        </div>
        <div className="mb-2">
          <span className="font-semibold">Email: </span>
          {editingStaff && editingStaff.id === staff.id ? (
            <input
              type="email"
              name="email"
              value={editForm.email}
              onChange={onEditChange}
              className="border px-2 py-1 rounded w-full text-sm"
            />
          ) : (
            <span>{staff.email}</span>
          )}
        </div>
        <div className="mb-2">
          <span className="font-semibold">Role: </span>
          <span>{staff.role}</span>
        </div>
        <div className="mb-2">
          <span className="font-semibold">Status: </span>
          <span>{staff.status}</span>
        </div>
        <div className="mb-2">
          <span className="font-semibold">Date Added: </span>
          <span>{staff.date_added}</span>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          {editingStaff && editingStaff.id === staff.id ? (
            <>
              <button
                className={`bg-green-700 text-white px-2 py-1 rounded text-sm ${
                  saving ? "opacity-50 cursor-not-allowed" : ""
                }`}
                onClick={onEditSave}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save"}
              </button>
              <button
                className={`bg-gray-400 text-white px-2 py-1 rounded text-sm ${
                  saving ? "opacity-50 cursor-not-allowed" : ""
                }`}
                onClick={onEditCancel}
                disabled={saving}
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                className="bg-red-600 text-white px-2 py-1 rounded text-sm"
                onClick={() => onEditClick(staff)}
              >
                Edit
              </button>
              <button
                className="bg-red-500 text-white px-2 py-1 rounded text-sm"
                onClick={() => onDeleteClick(staff)}
              >
                Delete
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
