import { useEffect, useState } from "react";
import ModalShell from "@/components/modals/ModalShell";
import Button from "@/components/ui/Button";

function formatDisplayFromUtc(isoString) {
  try {
    return (
      new Date(isoString).toLocaleString("en-US", {
        timeZone: "Asia/Manila",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }) + " (UTC+8)"
    );
  } catch (err) {
    return isoString;
  }
}

export default function InterviewScheduleModal({
  isOpen,
  onClose,
  onSave,
  initialValue = null,
  mode = "auto",
}) {
  const [dateTime, setDateTime] = useState(initialValue?.rawInput || "");
  const [interviewMode, setInterviewMode] = useState(
    initialValue?.mode || "onsite"
  );
  const [location, setLocation] = useState(initialValue?.location || "");
  const [link, setLink] = useState(initialValue?.link || "");
  const [duration, setDuration] = useState(initialValue?.duration || "45 minutes");
  const [focus, setFocus] = useState(initialValue?.focus || "technical background and problem-solving abilities");
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setDateTime(initialValue?.rawInput || "");
      setInterviewMode(initialValue?.mode || "onsite");
      setLocation(initialValue?.location || "");
      setLink(initialValue?.link || "");
      setDuration(initialValue?.duration || "45 minutes");
      setFocus(initialValue?.focus || "technical background and problem-solving abilities");
      setError("");
    }
  }, [isOpen, initialValue]);

  if (!isOpen) return null;

  const validate = () => {
    if (!dateTime) {
      setError("Please select a date and time (UTC+8).");
      return null;
    }

    const parsed = new Date(`${dateTime}:00+08:00`);
    if (Number.isNaN(parsed.getTime())) {
      setError("Please enter a valid date and time (UTC+8).");
      return null;
    }

    const modeValue = interviewMode || "onsite";
    if (modeValue === "onsite" && !location.trim()) {
      setError("Location is required for onsite interviews.");
      return null;
    }

    if (modeValue === "online" && !link.trim()) {
      setError("Link is required for online interviews.");
      return null;
    }

    const atUtc = parsed.toISOString();

    return {
      atUtc,
      timeZone: "UTC+8",
      display: formatDisplayFromUtc(atUtc),
      mode: modeValue,
      location: modeValue === "onsite" ? location.trim() : null,
      link: modeValue === "online" ? link.trim() : null,
      duration: duration.trim() || null,
      focus: focus.trim() || null,
      rawInput: dateTime,
    };
  };

  const handleSave = () => {
    const payload = validate();
    if (!payload) return;
    setError("");
    onSave?.(payload);
  };

  const footer = (
    <>
      <Button
        variant="ghost"
        onClick={onClose}
        mode={mode}
        className="flex-1"
      >
        Cancel
      </Button>
      <Button
        variant="primary"
        onClick={handleSave}
        mode={mode}
        className="flex-1"
      >
        Save Schedule
      </Button>
    </>
  );

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Set Interview Schedule"
      mode={mode}
      footer={footer}
      role="dialog"
    >
      <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          Set the interview date/time in UTC+8 and include the mode plus either a
          location or meeting link.
        </p>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">
            Date &amp; Time (UTC+8)
          </label>
          <input
            type="datetime-local"
            value={dateTime}
            onChange={(e) => setDateTime(e.target.value)}
            className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">
            Mode
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setInterviewMode("onsite")}
              className={`rounded border px-3 py-2 text-sm transition ${
                interviewMode === "onsite"
                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-200"
                  : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
              }`}
            >
              Onsite
            </button>
            <button
              type="button"
              onClick={() => setInterviewMode("online")}
              className={`rounded border px-3 py-2 text-sm transition ${
                interviewMode === "online"
                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-200"
                  : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
              }`}
            >
              Online
            </button>
          </div>
        </div>

        {interviewMode === "onsite" && (
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">
              Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Office address or meeting venue"
              className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
            />
          </div>
        )}

        {interviewMode === "online" && (
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">
              Meeting Link
            </label>
            <input
              type="text"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="Video call link"
              className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
            />
          </div>
        )}

        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Estimated Duration</label>
          <input
            type="text"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="e.g. 45 minutes"
            className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Interview focus/agenda</label>
          <input
            type="text"
            value={focus}
            onChange={(e) => setFocus(e.target.value)}
            placeholder="e.g. technical background and problem-solving abilities"
            className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
          />
        </div>

        {error && (
          <div className="p-2 rounded border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-xs text-red-700 dark:text-red-300">
            {error}
          </div>
        )}
      </div>
    </ModalShell>
  );
}
