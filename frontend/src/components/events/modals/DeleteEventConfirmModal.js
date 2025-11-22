"use client";

import ModalShell from "@/components/modals/ModalShell";
import { IoTrashOutline } from "react-icons/io5";

export default function DeleteEventConfirmModal({
  isOpen,
  eventTitle,
  onCancel,
  onConfirm,
  isSubmitting = false,
}) {
  const footer = (
    <div className="flex w-full justify-between gap-3">
      <button
        type="button"
        className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
        onClick={onCancel}
        disabled={isSubmitting}
      >
        Keep event
      </button>
      <button
        type="button"
        onClick={onConfirm}
        className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Deleting..." : "Delete event"}
      </button>
    </div>
  );

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onCancel}
      title="Delete event"
      description="This will permanently remove the event and its registrations."
      footer={footer}
      role="alertdialog"
    >
      <div className="space-y-4 text-sm text-gray-600 dark:text-gray-300">
        <p>
          You are about to delete <strong>{eventTitle}</strong>. Attendees will
          lose access to this event and any associated records.
        </p>
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-800 dark:border-red-400 dark:bg-red-900/30 dark:text-red-100">
          <IoTrashOutline className="mt-0.5 text-lg" />
          <p>
            This action cannot be undone. Consider postponing the event if you
            intend to reschedule instead of removing it entirely.
          </p>
        </div>
      </div>
    </ModalShell>
  );
}
