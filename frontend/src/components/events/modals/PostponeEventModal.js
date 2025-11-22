"use client";

import { useEffect, useMemo, useState } from "react";
import ModalShell from "@/components/modals/ModalShell";
import { IoAlertCircleOutline, IoCalendarOutline } from "react-icons/io5";

function toDateTimeLocalValue(value) {
  if (!value) return "";
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const pad = (num) => String(num).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
      date.getDate()
    )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  } catch (error) {
    return "";
  }
}

export default function PostponeEventModal({
  isOpen,
  eventTitle,
  defaultDate = null,
  onClose,
  onSubmit,
  isSubmitting = false,
}) {
  const [targetDate, setTargetDate] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    setTargetDate(toDateTimeLocalValue(defaultDate));
    setReason("");
    setError(null);
  }, [defaultDate, isOpen]);

  const isDateValid = useMemo(() => {
    if (!targetDate) return false;
    const parsed = new Date(targetDate);
    return !Number.isNaN(parsed.getTime());
  }, [targetDate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    if (!isDateValid) {
      setError("Please select a valid reschedule date and time.");
      return;
    }

    const payload = {
      postponed_until: new Date(targetDate).toISOString(),
      reason: reason.trim() || null,
    };

    try {
      await onSubmit?.(payload);
      onClose?.();
    } catch (submitError) {
      setError(submitError?.message || "Failed to postpone event.");
      return;
    }
  };

  const footer = (
    <div className="flex w-full justify-between gap-3">
      <button
        type="button"
        className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
        onClick={onClose}
        disabled={isSubmitting}
      >
        Cancel
      </button>
      <button
        type="submit"
        form="postpone-event-form"
        className="flex-1 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={!isDateValid || isSubmitting}
      >
        {isSubmitting ? "Postponing..." : "Confirm postponement"}
      </button>
    </div>
  );

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={eventTitle ? `Postpone "${eventTitle}"` : "Postpone event"}
      description="Let attendees know the event is temporarily unavailable and provide a tentative return date."
      footer={footer}
      role="alertdialog"
      size="lg"
    >
      <form
        id="postpone-event-form"
        className="space-y-4"
        onSubmit={handleSubmit}
      >
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
            <IoCalendarOutline className="text-base" /> Tentative new date
          </label>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Registrations pause immediately. Select when you expect to reopen
            the event.
          </p>
          <input
            type="datetime-local"
            className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            value={targetDate}
            onChange={(event) => setTargetDate(event.target.value)}
            required
          />
        </div>

        <div>
          <label className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Reason or attendee note
          </label>
          <textarea
            className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            rows={4}
            placeholder="Provide quick context so volunteers know why the event moved."
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </div>

        <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-400 dark:bg-amber-900/30 dark:text-amber-100">
          <IoAlertCircleOutline className="mt-0.5 text-base" />
          <p>
            Postponed events are hidden from volunteer sign-up lists until you
            publish them again. You can edit the schedule anytime from the event
            details page.
          </p>
        </div>

        {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
      </form>
    </ModalShell>
  );
}
