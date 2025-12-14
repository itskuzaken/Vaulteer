import { useState } from "react";
import ModalShell from "@/components/modals/ModalShell";
import Button from "@/components/ui/Button";

export default function StatusChangeConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  newStatus,
  currentStatus,
  processing,
  mode = "auto",
  schedule = null,
}) {
  const [reason, setReason] = useState("");
  const formatStatusLabel = (status) => {
    if (!status) return "";
    return status
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  if (!isOpen) return null;

  const footer = (
    <>
      <Button variant="ghost" onClick={onClose} disabled={processing} mode={mode} className="flex-1">
        Cancel
      </Button>
      <Button
        variant="primary"
        onClick={() => onConfirm(reason)}
        disabled={processing || (newStatus === "rejected" && reason.trim() === "")}
        mode={mode}
        className="flex-1"
      >
        {processing ? "Processing..." : "Confirm Change"}
      </Button>
    </>
  );

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Confirm Status Change"
      mode={mode}
      footer={footer}
      role="alertdialog"
    >
      <div className="space-y-4 text-sm text-gray-600 dark:text-gray-300">
        <div className="flex items-start gap-4">
          <div className="shrink-0 w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <svg
              className="w-6 h-6 text-amber-600 dark:text-amber-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Are you sure you want to change the application status from <span className="font-semibold">{formatStatusLabel(currentStatus)}</span> to <span className="font-semibold">{formatStatusLabel(newStatus)}</span>?
            </p>
          </div>
        </div>
        {newStatus === "approved" && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-xs text-green-700 dark:text-green-300">
              ✓ This will convert the applicant to a volunteer with active
              status
            </p>
          </div>
        )}
        {newStatus === "rejected" && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-xs text-red-700 dark:text-red-300 mb-2">
              ✗ This will set the user status to inactive
            </p>
            <label className="block text-xs text-gray-700 dark:text-gray-300 mb-1">Message</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter a message to include in the rejection email."
              className="w-full text-sm p-2 border rounded-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200"
              aria-required={true}
              required
              rows={3}
            />
            {newStatus === "rejected" && reason.trim() === "" && (
              <p className="text-xs text-red-600 mt-2">Message is required when rejecting an applicant.</p>
            )}
          </div>
        )}
        {newStatus === "interview_scheduled" && schedule && (
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-xs text-blue-700 dark:text-blue-300 font-semibold">Scheduled interview</p>
            <div className="text-xs text-gray-700 dark:text-gray-300 mt-2">
              <div>When: {schedule.display || schedule.atUtc}</div>
              <div>Mode: {schedule.mode === "online" ? "Online" : "Onsite"}</div>
              {schedule.location && <div>Location: {schedule.location}</div>}
              {schedule.link && <div>Link: {schedule.link}</div>}
              {schedule.duration && <div>Duration: {schedule.duration}</div>}
              {schedule.focus && <div>Agenda: {schedule.focus}</div>}
            </div>
          </div>
        )}
      </div>
    </ModalShell>
  );
}
