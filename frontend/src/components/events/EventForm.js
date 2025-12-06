"use client";

import { useEffect, useMemo, useState } from "react";
import {
  IoArrowBackOutline,
  IoRocketOutline,
  IoSaveOutline,
} from "react-icons/io5";

const DEFAULT_FORM_VALUES = {
  title: "",
  description: "",
  event_type: "other",
  location: "",
  location_type: "on_site",
  start_datetime: "",
  end_datetime: "",
  max_participants: "",
  min_participants: 0,
  registration_deadline: "",
  image_url: "",
  tags: "",
  requirements: "",
  contact_email: "",
  contact_phone: "",
};

const ACTION_LABELS = {
  create: {
    draft: "Save as Draft",
    publish: "Create & Publish",
  },
  edit: {
    draft: "Save Changes",
    publish: "Update & Publish",
  },
};

// Convert input to UTC ISO string. If input has timezone, respect it. If input is naive
// string (YYYY-MM-DDTHH:mm) we interpret it as +08 (Asia/Singapore).
const toISOStringOrNull = (value) => {
  if (!value) return null;
  try {
    const str = String(value).trim();
    const tzRegex = /(?:Z|[+-]\d{2}:?\d{2})$/;
    if (tzRegex.test(str)) {
      const date = new Date(str);
      if (Number.isNaN(date.getTime())) return null;
      return date.toISOString();
    }
    // naive input: YYYY-MM-DDTHH:mm or YYYY-MM-DD HH:mm
    const m = str.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/);
    if (!m) return null;
    const [ , y, mo, d, hh, mm, ss = '00' ] = m;
    const naiveUtcMs = Date.UTC(parseInt(y), parseInt(mo)-1, parseInt(d), parseInt(hh), parseInt(mm), parseInt(ss));
    const offsetMs = 8 * 60 * 60 * 1000; // +08:00
    const utcMs = naiveUtcMs - offsetMs;
    const date = new Date(utcMs);
    return date.toISOString();
  } catch (error) {
    return null;
  }
};

const normalizeNumber = (value, fallback = null) => {
  if (value === "" || value === null || value === undefined) {
    return fallback;
  }
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    return fallback;
  }
  return parsed;
};

export const buildEventFormInitialValues = (initialValues = {}) => {
  const tagsValue = Array.isArray(initialValues.tags)
    ? initialValues.tags.join(", ")
    : initialValues.tags ?? "";

  return {
    ...DEFAULT_FORM_VALUES,
    ...initialValues,
    tags: tagsValue,
    max_participants:
      initialValues.max_participants ?? DEFAULT_FORM_VALUES.max_participants,
    min_participants:
      initialValues.min_participants ?? DEFAULT_FORM_VALUES.min_participants,
  };
};

export const mapEventToFormValues = (eventData = {}) => {
  const toLocalInputValue = (value) => {
    if (!value) return "";
    try {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return "";
      // Convert UTC value to +08 local for input
      const offsetMs = 8 * 60 * 60 * 1000;
      const plus8 = new Date(date.getTime() + offsetMs);
      const pad = (num) => String(num).padStart(2, "0");
      const year = plus8.getUTCFullYear();
      const month = pad(plus8.getUTCMonth() + 1);
      const day = pad(plus8.getUTCDate());
      const hours = pad(plus8.getUTCHours());
      const minutes = pad(plus8.getUTCMinutes());
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    } catch (error) {
      return "";
    }
  };

  return buildEventFormInitialValues({
    title: eventData.title || "",
    description: eventData.description || "",
    event_type: eventData.event_type || "other",
    location: eventData.location || "",
    location_type: eventData.location_type || "on_site",
    start_datetime: toLocalInputValue(eventData.start_datetime),
    end_datetime: toLocalInputValue(eventData.end_datetime),
    max_participants:
      eventData.max_participants ?? DEFAULT_FORM_VALUES.max_participants,
    min_participants:
      eventData.min_participants ?? DEFAULT_FORM_VALUES.min_participants,
    registration_deadline: toLocalInputValue(eventData.registration_deadline),
    image_url: eventData.image_url || "",
    tags: Array.isArray(eventData.tags)
      ? eventData.tags.join(", ")
      : eventData.tags || "",
    requirements: eventData.requirements || "",
    contact_email: eventData.contact_email || "",
    contact_phone: eventData.contact_phone || "",
  });
};

const normalizeFormPayload = (formData) => ({
  title: formData.title.trim(),
  description: formData.description || "",
  event_type: formData.event_type || "other",
  location: formData.location || "",
  location_type: formData.location_type || "on_site",
  start_datetime: toISOStringOrNull(formData.start_datetime),
  end_datetime: toISOStringOrNull(formData.end_datetime),
  max_participants: normalizeNumber(formData.max_participants, null),
  min_participants: normalizeNumber(formData.min_participants, 0),
  registration_deadline: toISOStringOrNull(formData.registration_deadline),
  image_url: formData.image_url || "",
  tags: formData.tags
    ? formData.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
    : [],
  requirements: formData.requirements || "",
  contact_email: formData.contact_email || "",
  contact_phone: formData.contact_phone || "",
});

export default function EventForm({
  mode = "create",
  initialValues = DEFAULT_FORM_VALUES,
  onBack,
  onSaveDraft,
  onPublish,
  onValidationError,
}) {
  const [formData, setFormData] = useState(
    buildEventFormInitialValues(initialValues)
  );
  const [errors, setErrors] = useState({});
  const [submittingAction, setSubmittingAction] = useState(null);

  useEffect(() => {
    setFormData(buildEventFormInitialValues(initialValues));
    setErrors({});
  }, [initialValues]);

  const actionLabels = ACTION_LABELS[mode] || ACTION_LABELS.create;

  const headerTitle = useMemo(() => {
    return mode === "edit" ? "Edit Event" : "Create New Event";
  }, [mode]);

  const headerSubtitle = useMemo(() => {
    return mode === "edit"
      ? "Update the details below and save your changes."
      : "Fill in the details to create a new event.";
  }, [mode]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = "Title is required";
    }

    if (!formData.start_datetime) {
      newErrors.start_datetime = "Start date and time is required";
    }

    if (!formData.end_datetime) {
      newErrors.end_datetime = "End date and time is required";
    }

    if (formData.start_datetime && formData.end_datetime) {
      // Interpret inputs as +08 naive local times when comparing
      const parseToUTCFromPlus8 = (str) => {
        const m = String(str).match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/);
        if (!m) return new Date(str); // fallback
        const [ , y, mo, d, hh, mm, ss='00' ] = m;
        const naiveUtcMs = Date.UTC(parseInt(y), parseInt(mo)-1, parseInt(d), parseInt(hh), parseInt(mm), parseInt(ss));
        const offsetMs = 8 * 60 * 60 * 1000;
        const utcMs = naiveUtcMs - offsetMs;
        return new Date(utcMs);
      };
      const start = parseToUTCFromPlus8(formData.start_datetime);
      const end = parseToUTCFromPlus8(formData.end_datetime);
      if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
        if (end <= start) {
          newErrors.end_datetime = "End date must be after start date";
        }
      }
    }

    if (formData.registration_deadline && formData.start_datetime) {
      const parseToUTCFromPlus8 = (str) => {
        const m = String(str).match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/);
        if (!m) return new Date(str);
        const [ , y, mo, d, hh, mm, ss='00' ] = m;
        const naiveUtcMs = Date.UTC(parseInt(y), parseInt(mo)-1, parseInt(d), parseInt(hh), parseInt(mm), parseInt(ss));
        const offsetMs = 8 * 60 * 60 * 1000;
        const utcMs = naiveUtcMs - offsetMs;
        return new Date(utcMs);
      };
      const deadline = parseToUTCFromPlus8(formData.registration_deadline);
      const start = parseToUTCFromPlus8(formData.start_datetime);
      if (
        !Number.isNaN(deadline.getTime()) &&
        !Number.isNaN(start.getTime()) &&
        deadline >= start
      ) {
        newErrors.registration_deadline =
          "Registration deadline must be before event start";
      }
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      onValidationError?.();
      return false;
    }
    // Additional check: start datetime must not be in the past relative to +08
    if (formData.start_datetime) {
      const nowUtc = Date.now();
      const parseToUTCFromPlus8 = (str) => {
        const m = String(str).match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/);
        if (!m) return new Date(str);
        const [ , y, mo, d, hh, mm, ss='00' ] = m;
        const naiveUtcMs = Date.UTC(parseInt(y), parseInt(mo)-1, parseInt(d), parseInt(hh), parseInt(mm), parseInt(ss));
        const offsetMs = 8 * 60 * 60 * 1000;
        const utcMs = naiveUtcMs - offsetMs;
        return new Date(utcMs);
      };
      const startUtc = parseToUTCFromPlus8(formData.start_datetime);
      if (startUtc.getTime() <= nowUtc) {
        newErrors.start_datetime = 'Start date cannot be in the past';
        setErrors(newErrors);
        onValidationError?.();
        return false;
      }
    }
    return true;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const handleSubmit = async (intent) => {
    if (submittingAction) return;
    if (!validateForm()) {
      return;
    }

    const payload = normalizeFormPayload(formData);

    try {
      setSubmittingAction(intent);
      if (intent === "publish") {
        await onPublish?.(payload);
      } else {
        await onSaveDraft?.(payload);
      }
    } catch (error) {
      console.error("EventForm submission failed", error);
    } finally {
      setSubmittingAction(null);
    }
  };

  const draftDisabled =
    submittingAction !== null || typeof onSaveDraft !== "function";
  const publishDisabled =
    submittingAction !== null || typeof onPublish !== "function";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {headerTitle}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {headerSubtitle}
          </p>
        </div>
        {typeof onBack === "function" && (
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <IoArrowBackOutline />
            <span>Back</span>
          </button>
        )}
      </div>

      {/* Form */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-md p-6">
        <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
          {/* Basic Information */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Basic Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Title */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Event Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                    errors.title
                      ? "border-red-500"
                      : "border-gray-300 dark:border-gray-600"
                  }`}
                  placeholder="Enter event title"
                />
                {errors.title && (
                  <p className="mt-1 text-sm text-red-500">{errors.title}</p>
                )}
              </div>

              {/* Description */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Describe the event"
                />
              </div>

              {/* Event Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Event Type
                </label>
                <select
                  name="event_type"
                  value={formData.event_type}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="training">Training</option>
                  <option value="community_service">Community Service</option>
                  <option value="fundraising">Fundraising</option>
                  <option value="meeting">Meeting</option>
                  <option value="social">Social</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Location Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Location Type
                </label>
                <select
                  name="location_type"
                  value={formData.location_type}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="on_site">On-site</option>
                  <option value="remote">Remote</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>

              {/* Location */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Location / Venue
                </label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Enter location or online meeting link"
                />
              </div>
            </div>
          </div>

          {/* Date and Time */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Date and Time
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Start DateTime */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Start Date & Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  name="start_datetime"
                  value={formData.start_datetime}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                    errors.start_datetime
                      ? "border-red-500"
                      : "border-gray-300 dark:border-gray-600"
                  }`}
                />
                {errors.start_datetime && (
                  <p className="mt-1 text-sm text-red-500">
                    {errors.start_datetime}
                  </p>
                )}
              </div>

              {/* End DateTime */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  End Date & Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  name="end_datetime"
                  value={formData.end_datetime}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                    errors.end_datetime
                      ? "border-red-500"
                      : "border-gray-300 dark:border-gray-600"
                  }`}
                />
                {errors.end_datetime && (
                  <p className="mt-1 text-sm text-red-500">
                    {errors.end_datetime}
                  </p>
                )}
              </div>

              {/* Registration Deadline */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Registration Deadline
                </label>
                <input
                  type="datetime-local"
                  name="registration_deadline"
                  value={formData.registration_deadline}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                    errors.registration_deadline
                      ? "border-red-500"
                      : "border-gray-300 dark:border-gray-600"
                  }`}
                />
                {errors.registration_deadline && (
                  <p className="mt-1 text-sm text-red-500">
                    {errors.registration_deadline}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Capacity */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Capacity
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Max Participants */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Maximum Participants
                </label>
                <input
                  type="number"
                  name="max_participants"
                  value={formData.max_participants}
                  onChange={handleChange}
                  min="1"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Leave empty for unlimited"
                />
              </div>

              {/* Min Participants */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Minimum Participants
                </label>
                <input
                  type="number"
                  name="min_participants"
                  value={formData.min_participants}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Additional Details */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Additional Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Image URL */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Image URL
                </label>
                <input
                  type="text"
                  name="image_url"
                  value={formData.image_url}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              {/* Tags */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  name="tags"
                  value={formData.tags}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="e.g., volunteer, training, community"
                />
              </div>

              {/* Requirements */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Requirements
                </label>
                <textarea
                  name="requirements"
                  value={formData.requirements}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Special requirements or prerequisites"
                />
              </div>

              {/* Contact Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Contact Email
                </label>
                <input
                  type="email"
                  name="contact_email"
                  value={formData.contact_email}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="contact@example.com"
                />
              </div>

              {/* Contact Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  name="contact_phone"
                  value={formData.contact_phone}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="+63 912 345 6789"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 pt-6 border-t border-gray-200 dark:border-gray-700 md:flex-row md:justify-end">
            {typeof onSaveDraft === "function" && (
              <button
                type="button"
                onClick={() => handleSubmit("draft")}
                disabled={draftDisabled}
                className="flex items-center justify-center gap-2 px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <IoSaveOutline className="text-lg" />
                <span>
                  {submittingAction === "draft"
                    ? "Saving..."
                    : actionLabels.draft}
                </span>
              </button>
            )}
            {typeof onPublish === "function" && (
              <button
                type="button"
                onClick={() => handleSubmit("publish")}
                disabled={publishDisabled}
                className="flex items-center justify-center gap-2 px-6 py-2 bg-[var(--primary-red)] hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <IoRocketOutline className="text-lg" />
                <span>
                  {submittingAction === "publish"
                    ? "Submitting..."
                    : actionLabels.publish}
                </span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
