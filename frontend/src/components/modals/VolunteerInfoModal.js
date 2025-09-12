import React, { useRef, useEffect } from "react";
import DeleteVolunteerModal from "./DeleteVolunteerModal";

/**
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {Object} props.volunteer
 * @param {Object} props.editingVolunteer
 * @param {Object} props.editForm
 * @param {string} props.statusEdit
 * @param {boolean} props.saving
 * @param {Function} props.onEditClick
 * @param {Function} props.onEditChange
 * @param {Function} props.onStatusChange
 * @param {Function} props.onEditSave
 * @param {Function} props.onEditCancel
 * @param {Function} props.onDeleteClick
 * @param {Function} props.onClose
 */
export default function VolunteerInfoModal({
  isOpen,
  volunteer,
  editingVolunteer,
  editForm,
  statusEdit,
  saving,
  onEditClick,
  onEditChange,
  onStatusChange,
  onEditSave,
  onEditCancel,
  onDeleteClick,
  onClose,
  showDeleteModal,
  volunteerToDelete,
  onDeleteCancel,
  onDeleteConfirm,
}) {
  const modalRef = useRef(null);

  useEffect(() => {
    if (isOpen && modalRef.current) modalRef.current.focus();
  }, [isOpen]);

  if (!isOpen || !volunteer) return null;

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
        <DeleteVolunteerModal
          isOpen={showDeleteModal}
          volunteer={volunteerToDelete}
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
          Volunteer Information
        </h2>
        <div className="mb-2">
          <span className="font-semibold">ID: </span>
          <span>{volunteer.id}</span>
        </div>
        <div className="mb-2">
          <span className="font-semibold">Name: </span>
          {editingVolunteer && editingVolunteer.id === volunteer.id ? (
            <input
              type="text"
              name="name"
              value={editForm.name}
              onChange={onEditChange}
              className="border px-2 py-1 rounded w-full text-sm"
              autoFocus
            />
          ) : (
            <span>{volunteer.name}</span>
          )}
        </div>
        <div className="mb-2">
          <span className="font-semibold">Email: </span>
          {editingVolunteer && editingVolunteer.id === volunteer.id ? (
            <input
              type="email"
              name="email"
              value={editForm.email}
              onChange={onEditChange}
              className="border px-2 py-1 rounded w-full text-sm"
            />
          ) : (
            <span>{volunteer.email}</span>
          )}
        </div>
        <div className="mb-2">
          <span className="font-semibold">Role: </span>
          <span>{volunteer.role}</span>
        </div>
        <div className="mb-2">
          <span className="font-semibold">Status: </span>
          {editingVolunteer && editingVolunteer.id === volunteer.id ? (
            <select
              className="border px-2 py-1 rounded w-full text-sm"
              value={statusEdit}
              onChange={(e) => onStatusChange(e.target.value)}
            >
              <option value="active">active</option>
              <option value="inactive">inactive</option>
            </select>
          ) : (
            <span>{volunteer.status}</span>
          )}
        </div>
        <div className="mb-2">
          <span className="font-semibold">Date Added: </span>
          <span>{volunteer.date_added}</span>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          {editingVolunteer && editingVolunteer.id === volunteer.id ? (
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
                className="bg-blue-500 text-white px-2 py-1 rounded text-sm"
                onClick={() => onEditClick(volunteer)}
              >
                Edit
              </button>
              <button
                className="bg-red-500 text-white px-2 py-1 rounded text-sm"
                onClick={() => onDeleteClick(volunteer)}
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
