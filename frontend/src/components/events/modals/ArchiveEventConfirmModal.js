"use client";

import ModalShell from "@/components/modals/ModalShell";
import { IoArchiveOutline } from "react-icons/io5";

export default function ArchiveEventConfirmModal({
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
        className="flex-1 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Archiving..." : "Archive event"}
      </button>
    </div>
  );

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onCancel}
      title="Archive event"
      description="This will archive the event for reference and remove it from live listings, but records will be retained for reporting."
      footer={footer}
      role="alertdialog"
    >
      <div className="space-y-4 text-sm text-gray-600 dark:text-gray-300">
        <p>
          You are about to archive <strong>{eventTitle}</strong>. Volunteers will
          no longer be able to register for this event, and it will be moved to
          your archived events list.
        </p>
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800 dark:border-amber-500 dark:bg-amber-900/30 dark:text-amber-100">
          <IoArchiveOutline className="mt-0.5 text-lg" />
          <p>
            This action is reversible — you can publish the event again if you
            need to restore it.
          </p>
        </div>
      </div>
    </ModalShell>
  );
}
