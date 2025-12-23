"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Button from '@/components/ui/Button';
import { format } from "date-fns";
import {
  IoArrowBackOutline,
  IoCalendarOutline,
  IoTimeOutline,
  IoLocationOutline,
  IoPeopleOutline,
  IoCopyOutline,
  IoShareSocialOutline,
  IoPricetagOutline,
  IoMailOutline,
  IoCallOutline,
  IoPencilOutline,
  IoPauseOutline,
  IoDocumentTextOutline,
  IoAlertCircleOutline,
  IoArchiveOutline,
  IoBanOutline,
  IoQrCodeOutline,
} from "react-icons/io5";
import { useNotify } from "@/components/ui/NotificationProvider";
import EventStatusBadge from "@/components/events/EventStatusBadge";
import JoinEventButton from "@/components/events/JoinEventButton";
import {
  getEventDetails,
  getEventParticipants,
  updateEvent,
  publishEvent,
  postponeEvent,
  archiveEvent,
  cancelEvent,
} from "@/services/eventService";
import { buildEventDetailPath } from "@/utils/dashboardRouteHelpers";
import EventForm, { mapEventToFormValues } from "@/components/events/EventForm";
import PostponeEventModal from "@/components/events/modals/PostponeEventModal";
import ArchiveEventConfirmModal from "@/components/events/modals/ArchiveEventConfirmModal";
import CancelEventConfirmModal from "@/components/events/modals/CancelEventConfirmModal";
import AttendancePanel from '@/components/events/AttendancePanel';
import EventReportsPanel from '@/components/events/EventReportsPanel';
import Modal from '@/components/modals/ModalShell';

const formatDate = (value, pattern = "MMMM dd, yyyy") => {
  if (!value) return "–";
  try {
    return format(new Date(value), pattern);
  } catch (error) {
    return value;
  }
};

const PARTICIPANT_TABS = [
  { key: "registered", label: "Registered" },
  { key: "waitlisted", label: "Waitlisted" },
  { key: "attended", label: "Attended" },
  { key: "cancelled", label: "Cancelled" },
];

export default function EventDetailsPage({ eventUid, currentUser, initialEdit = false, initialCancel = false }) {
  const router = useRouter();
  const notify = useNotify();
  const [eventData, setEventData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [participantsVisibility, setParticipantsVisibility] = useState("none");
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [participantError, setParticipantError] = useState(null);
  const [activeParticipantTab, setActiveParticipantTab] = useState("registered");
  const [isEditing, setIsEditing] = useState(false);
  
  // Modal States
  const [showPostponeModal, setShowPostponeModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(Boolean(initialCancel));
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  
  const [isActionLoading, setIsActionLoading] = useState(false);
  
  // State for hydration-safe URL generation
  const [shareUrl, setShareUrl] = useState("");

  const role = (currentUser?.role || "volunteer").toLowerCase();
  const canManageEvent = role === "admin" || role === "staff";
  
  const isEventCreator =
    currentUser?.user_id &&
    eventData?.created_by_user_id &&
    String(currentUser.user_id) === String(eventData.created_by_user_id);
    
  const canEditEvent = isEventCreator || role === "admin";
  const isPostponed = (eventData?.status || "").toLowerCase() === "postponed";

  const sharePath = useMemo(() => {
    if (!eventUid) return null;
    return buildEventDetailPath(currentUser?.role, eventUid);
  }, [currentUser?.role, eventUid]);

  useEffect(() => {
    if (typeof window !== "undefined" && sharePath) {
      setShareUrl(`${window.location.origin}${sharePath}`);
    }
  }, [sharePath]);

  const participantSummary = useMemo(() => {
    if (!eventData) return "Participants";
    const current = eventData.participant_count || 0;
    const max = eventData.max_participants;
    if (!max) return `${current} participant${current === 1 ? "" : "s"}`;
    return `${current}/${max} participant${max === 1 ? "" : "s"}`;
  }, [eventData]);

  const participantBuckets = useMemo(() => {
    return participants.reduce((acc, participant) => {
      const status = participant.status || "registered";
      if (!acc[status]) {
        acc[status] = [];
      }
      acc[status].push(participant);
      return acc;
    }, {});
  }, [participants]);

  const canViewParticipants = useMemo(() => {
    if (canManageEvent) return true;
    return Boolean(eventData?.is_registered);
  }, [canManageEvent, eventData?.is_registered]);

  // Logic to determine if attendance button should be shown
  const canShowAttendanceButton = useMemo(() => {
    const start = eventData?.start_datetime ? new Date(eventData.start_datetime) : null;
    const windowMins = eventData?.attendance_checkin_window_mins ?? 15;
    const now = new Date();
    const windowStart = start ? new Date(start.getTime() - windowMins * 60000) : null;
    
    // Show if check-in window has started and event is not cancelled
    return Boolean(
      windowStart && 
      now >= windowStart && 
      !['cancelled'].includes((eventData?.status||'').toLowerCase())
    );
  }, [eventData]);

  const mutatingParticipantCount = useCallback((statusOrBool, meta = {}) => {
    setEventData((prev) => {
      if (!prev) return prev;

      const prevParticipants =
        typeof prev.participant_count === "number" ? prev.participant_count : 0;
      const prevWaitlist =
        typeof prev.waitlist_count === "number" ? prev.waitlist_count : 0;

      if (typeof statusOrBool === "boolean") {
        const isRegistered = statusOrBool;
        const nextCount = isRegistered
          ? prevParticipants + 1
          : Math.max(0, prevParticipants - 1);
        if (meta && meta.refresh) setTimeout(() => { if (typeof loadEventDetails === 'function') loadEventDetails(); }, 50);
        return {
          ...prev,
          is_registered: isRegistered,
          participant_count: nextCount,
        };
      }

      const status = (meta && meta.status) || statusOrBool;

      if (status === "registered") {
        if (meta && meta.refresh) setTimeout(() => { if (typeof loadEventDetails === 'function') loadEventDetails(); }, 50);
        return {
          ...prev,
          is_registered: true,
          participant_count: prevParticipants + 1,
        };
      }

      if (status === "waitlisted") {
        if (meta && meta.refresh) setTimeout(() => { if (typeof loadEventDetails === 'function') loadEventDetails(); }, 50);
        return {
          ...prev,
          participation_status: "waitlisted",
          waitlist_count: prevWaitlist + 1,
        };
      }

      if (status === null) {
        if (meta && meta.refresh) setTimeout(() => { if (typeof loadEventDetails === 'function') loadEventDetails(); }, 50);
        if (meta && meta.wasWaitlisted) {
          return {
            ...prev,
            participation_status: null,
            waitlist_count: Math.max(0, prevWaitlist - 1),
          };
        }
        return {
          ...prev,
          is_registered: false,
          participant_count: Math.max(0, prevParticipants - 1),
        };
      }

      return prev;
    });
  }, []);

  const loadEventDetails = useCallback(async () => {
    if (!eventUid) {
        setError("No event ID provided.");
        setIsLoading(false);
        return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await getEventDetails(eventUid);
      setEventData(response.data);
    } catch (err) {
      console.error("Failed to load event details", err);
      setError(err.message || "Failed to load event details");
    } finally {
      setIsLoading(false);
    }
  }, [eventUid]);

  const loadParticipants = useCallback(async () => {
    if (!eventUid || !canViewParticipants) {
      setParticipants([]);
      return;
    }

    setParticipantsLoading(true);
    setParticipantError(null);
    try {
      const response = await getEventParticipants(eventUid);
      setParticipants(response.data || []);
      setParticipantsVisibility(
        response.visibility || (canManageEvent ? "full" : "limited")
      );
    } catch (err) {
      console.error("Failed to load participants", err);
      setParticipantError(
        err?.message ||
          (err?.status === 403
            ? "Only registered participants can view the attendee list."
            : "Failed to load participants.")
      );
      setParticipants([]);
    } finally {
      setParticipantsLoading(false);
    }
  }, [eventUid, canViewParticipants, canManageEvent]);

  useEffect(() => {
    loadEventDetails();
  }, [loadEventDetails]);

  useEffect(() => {
    if (!initialEdit || !eventData) return;
    if (eventData.status === 'completed') {
      notify?.push('Cannot open editor for a completed event', 'warning');
      return;
    }
    if ((eventData.status || "").toLowerCase() === 'cancelled') {
      notify?.push('Cannot open editor for a cancelled event', 'warning');
      return;
    }
    if (canEditEvent) setIsEditing(true);
  }, [initialEdit, eventData, canEditEvent, notify]);

  useEffect(() => {
    if (!eventData) return;
    loadParticipants();
  }, [eventData, loadParticipants]);

  const canManageEventForReports = role === 'admin' || role === 'staff';

  const handleCopyLink = async () => {
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      notify?.push("Clipboard API is unavailable in this browser.", "warning");
      return;
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      notify?.push("Event link copied to clipboard", "success");
    } catch (err) {
      console.error("Failed to copy", err);
      notify?.push("Unable to copy link", "error");
    }
  };

  const handleEditToggle = () => {
    if (!canEditEvent) return;
    if (eventData?.status === 'completed') return;
    if ((eventData?.status || "").toLowerCase() === 'cancelled') return;
    setIsEditing((prev) => !prev);
  };

  const handlePersistedUpdate = useCallback(
    async (payload, intent = "draft") => {
      if (!eventUid) return;
      try {
        const response = await updateEvent(eventUid, payload);
        if (intent === "publish") {
          await publishEvent(eventUid);
        }
        if (response?.data) {
          setEventData(response.data);
        }
        await loadEventDetails();
        await loadParticipants();
        notify?.push(
          intent === "publish"
            ? "Event updated and published successfully!"
            : "Event updated successfully!",
          "success"
        );
        setIsEditing(false);
      } catch (err) {
        console.error("Failed to save event", err);
        notify?.push(err?.message || "Failed to save changes", "error");
        throw err;
      }
    },
    [eventUid, loadEventDetails, loadParticipants, notify]
  );

  const handleSaveDraft = useCallback(
    (payload) => handlePersistedUpdate(payload, "draft"),
    [handlePersistedUpdate]
  );

  const handlePublishChanges = useCallback(
    (payload) => handlePersistedUpdate(payload, "publish"),
    [handlePersistedUpdate]
  );

  const handlePostponeEvent = useCallback(
    async (payload) => {
      if (!eventUid) return;
      setIsActionLoading(true);
      try {
        await postponeEvent(eventUid, payload);
        notify?.push("Event postponed", "success");
        setShowPostponeModal(false);
        await loadEventDetails();
      } catch (err) {
        console.error("Failed to postpone event", err);
        notify?.push(err?.message || "Failed to postpone event", "error");
        throw err;
      } finally {
        setIsActionLoading(false);
      }
    },
    [eventUid, loadEventDetails, notify]
  );

  const handleArchiveEvent = useCallback(async () => {
    if (!eventUid) return;
    setIsActionLoading(true);
    try {
      await archiveEvent(eventUid);
      notify?.push("Event archived", "success");
      setShowArchiveModal(false);
      await loadEventDetails();
      router.back();
    } catch (err) {
      console.error("Failed to archive event", err);
      notify?.push(err?.message || "Failed to archive event", "error");
    } finally {
      setIsActionLoading(false);
    }
  }, [eventUid, notify, router, loadEventDetails]);

    const handleCancelEvent = useCallback(async () => {
      if (!eventUid) return;
      setIsActionLoading(true);
      try {
        await cancelEvent(eventUid);
        notify?.push("Event cancelled", "success");
        setShowCancelModal(false);
        await loadEventDetails();
        router.back();
      } catch (err) {
        console.error("Failed to cancel event", err);
        notify?.push(err?.message || "Failed to cancel event", "error");
      } finally {
        setIsActionLoading(false);
      }
    }, [eventUid, notify, router, loadEventDetails]);

  if (isLoading) {
    return (
      <div className="space-y-4 sm:space-y-6 animate-pulse">
        {/* Header Skeleton */}
        <div className="h-8 w-32 bg-gray-200 dark:bg-gray-800 rounded" />
        
        {/* Responsive Grid Skeleton (Updated to md) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {/* Main Content Area - Left Column */}
          <div className="md:col-span-2 space-y-4 sm:space-y-6">
            {/* Hero Image Skeleton */}
            <div className="h-48 sm:h-56 md:h-72 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
            
            {/* Info Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="h-24 bg-gray-200 dark:bg-gray-800 rounded-xl" />
              <div className="h-24 bg-gray-200 dark:bg-gray-800 rounded-xl" />
              <div className="h-24 bg-gray-200 dark:bg-gray-800 rounded-xl" />
            </div>
            
            {/* Description/Content Skeleton */}
            <div className="space-y-4">
              <div className="h-40 bg-gray-200 dark:bg-gray-800 rounded-xl" />
              <div className="h-40 bg-gray-200 dark:bg-gray-800 rounded-xl" />
            </div>
          </div>

          {/* Sidebar Area - Right Column on Desktop */}
          <div className="space-y-4 sm:space-y-6">
            <div className="h-32 bg-gray-200 dark:bg-gray-800 rounded-xl" />
            <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-xl" />
            <div className="h-32 bg-gray-200 dark:bg-gray-800 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !eventData) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 sm:p-10 text-center">
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white mb-3">
          Unable to load event
        </h2>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-6">
          {error ||
            "This event could not be found or you might not have permission to view it."}
        </p>
        <Button
          variant="secondary"
          icon={IoArrowBackOutline}
          onClick={() => router.back()}
          className="px-4 py-2 sm:px-5 sm:py-3 bg-gray-900 text-white hover:bg-gray-800"
          mode="dark"
          size={{ default: 'small', md: 'medium' }}
        >
          Return to previous page
        </Button>
      </div>
    );
  }

  if (isEditing && eventData) {
    return (
      <EventForm
        mode="edit"
        initialValues={mapEventToFormValues(eventData)}
        onBack={() => setIsEditing(false)}
        onSaveDraft={handleSaveDraft}
        onPublish={handlePublishChanges}
        onValidationError={() =>
          notify?.push("Please fix the errors in the form", "error")
        }
      />
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header Section - Mobile Responsive */}
      <div className="flex flex-col gap-4">
        <Button
          variant="ghost"
          icon={IoArrowBackOutline}
          onClick={() => router.back()}
          className="text-sm font-medium self-start"
          size={{ default: 'small', md: 'medium' }}
        >
          Back to previous view
        </Button>
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {eventData.status && <EventStatusBadge status={eventData.status} />}
          {canEditEvent && eventData?.status !== 'completed' && !isPostponed && ((eventData?.status || "").toLowerCase() !== "cancelled") && (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="ghost"
                icon={IoPencilOutline}
                onClick={handleEditToggle}
                size={{ default: 'small', md: 'medium' }}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-800"
              >
                {isEditing ? "Cancel" : "Edit"}
              </Button>
              {eventData?.status && ["published"].includes((eventData.status || "").toLowerCase()) && (
                <Button
                  variant="ghost"
                  icon={IoPauseOutline}
                  onClick={() => setShowPostponeModal(true)}
                  disabled={isActionLoading}
                  size={{ default: 'small', md: 'medium' }}
                  className="inline-flex items-center gap-2 bg-gray-600 hover:bg-gray-800"
                >
                  Postpone
                </Button>
              )}
              {eventData?.status && ["published", "postponed"].includes((eventData.status || "").toLowerCase()) && (
                <Button
                  variant="ghost"
                  icon={IoArchiveOutline}
                  onClick={() => setShowArchiveModal(true)}
                  size={{ default: 'small', md: 'medium' }}
                  className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 dark:bg-amber-500 dark:hover:bg-amber-800"
                >
                  Archive
                </Button>
              )}
              {eventData?.status && ["published", "postponed"].includes((eventData.status || "").toLowerCase()) && (
                <Button
                  variant="ghost"
                  icon={IoBanOutline}
                  onClick={() => setShowCancelModal(true)}
                  size={{ default: 'small', md: 'medium' }}
                  className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-800"
                >
                  Cancel
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Content Layout - Responsive Grid (Updated to md) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        {/* Main Content - Takes 2 columns on medium+ screens */}
        <div className="md:col-span-2 space-y-4 sm:space-y-6">
          {/* Event Hero Section */}
          <section className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
            <div className="relative h-48 sm:h-56 md:h-72 w-full bg-gray-100 dark:bg-gray-800">
              {eventData.image_url ? (
                <Image
                  src={eventData.image_url}
                  alt={eventData.title}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 768px) 100vw, 100vw"
                  className="object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
                  <IoCalendarOutline className="text-3xl sm:text-4xl" />
                  <p className="mt-2 text-sm sm:text-base">No cover image</p>
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/70 to-transparent p-4 sm:p-6">
                <p className="text-xs sm:text-sm text-white/80 uppercase tracking-wide">
                  {formatDate(eventData.start_datetime_local || eventData.start_datetime, "eeee, MMM dd")}
                </p>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold text-white leading-tight">
                  {eventData.title}
                </h1>
              </div>
            </div>

            {/* Event Info Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 p-4 sm:p-6">
              <div className="rounded-xl bg-gray-50 dark:bg-gray-800/70 p-3 sm:p-4 border border-gray-200 dark:border-gray-700">
                <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-2 mb-2">
                  <IoCalendarOutline className="text-sm" /> Schedule
                </p>
                <p className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 dark:text-white">
                  {formatDate(eventData.start_datetime_local || eventData.start_datetime)}
                </p>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2 mt-1">
                  <IoTimeOutline className="text-sm" />
                  {`${formatDate(
                    eventData.start_datetime_local || eventData.start_datetime,
                    "h:mm a"
                  )} – ${formatDate(eventData.end_datetime, "h:mm a")}`}
                </p>
                {eventData.registration_deadline && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Register until{" "}
                    {formatDate(
                      eventData.registration_deadline,
                      "MMM dd, yyyy p"
                    )}
                  </p>
                )}
              </div>

              <div className="rounded-xl bg-gray-50 dark:bg-gray-800/70 p-3 sm:p-4 border border-gray-200 dark:border-gray-700">
                <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-2 mb-2">
                  <IoLocationOutline className="text-sm" /> Location
                </p>
                <p className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 dark:text-white">
                  {eventData.location || "TBA"}
                </p>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                  {eventData.location_type?.replace("_", " ")}
                </p>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mt-1 flex items-center gap-2">
                  <IoPeopleOutline className="text-sm" /> {participantSummary}
                </p>
              </div>

              <div className="rounded-xl bg-gray-50 dark:bg-gray-800/70 p-3 sm:p-4 border border-gray-200 dark:border-gray-700 sm:col-span-2 lg:col-span-1">
                <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-2 mb-2">
                  <IoDocumentTextOutline className="text-sm" /> Host
                </p>
                <p className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 dark:text-white">
                  {eventData.created_by_name || "Vaulteer"}
                </p>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                  {eventData.created_by_email || "–"}
                </p>
              </div>
            </div>
          </section>

          {isPostponed && (
            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-6 text-amber-900 dark:border-amber-500 dark:bg-amber-900/20 dark:text-amber-100">
              <div className="flex items-start gap-3">
                <IoAlertCircleOutline className="mt-1 text-xl sm:text-2xl shrink-0" />
                <div className="min-w-0 flex-1">
                  <h2 className="text-base sm:text-lg font-semibold mb-2">
                    This event is currently postponed
                  </h2>
                  <p className="text-sm text-amber-900/80 dark:text-amber-100/80">
                    Participants will be notified once you publish the updated
                    schedule.
                  </p>
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-amber-800/70 dark:text-amber-100/70 mb-1">
                    Estimated return
                  </p>
                  <p className="text-sm sm:text-base font-semibold">
                    {eventData.postponed_until
                      ? `${formatDate(
                          eventData.postponed_until
                        )} · ${formatDate(eventData.postponed_until, "h:mm a")}`
                      : "Not set"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-amber-800/70 dark:text-amber-100/70 mb-1">
                    Original schedule
                  </p>
                  <p className="text-sm sm:text-base font-semibold">
                    {eventData.previous_start_datetime
                      ? `${formatDate(
                          eventData.previous_start_datetime
                        )} · ${formatDate(
                          eventData.previous_start_datetime,
                          "h:mm a"
                        )}`
                      : `${formatDate(eventData.start_datetime_local || eventData.start_datetime)} · ${formatDate(
                          eventData.start_datetime_local || eventData.start_datetime,
                          "h:mm a"
                        )}`}
                  </p>
                </div>
              </div>
              {eventData.postponed_reason && (
                <p className="mt-4 rounded-xl bg-white/70 p-3 sm:p-4 text-sm font-medium text-amber-900 dark:bg-amber-900/40 dark:text-amber-50">
                  &ldquo;{eventData.postponed_reason}&rdquo;
                </p>
              )}
            </section>
          )}

          {eventData.description && (
            <section className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                About this event
              </h2>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">
                {eventData.description}
              </p>
            </section>
          )}

          {/* Requirements and Tags */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 sm:p-6">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                <IoPricetagOutline /> Requirements
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line">
                {eventData.requirements || "No special requirements listed."}
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 sm:p-6">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                <IoPricetagOutline /> Tags
              </h3>
              {eventData.tags && eventData.tags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {eventData.tags.map((tag, index) => (
                    <span
                      key={`${tag}-${index}`}
                      className="px-2 sm:px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  No tags added for this event.
                </p>
              )}
            </div>
          </div>

          <section className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 sm:p-6">
            <div className="flex flex-col gap-4 mb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Participants
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {canViewParticipants
                      ? "Live list of confirmed and waitlisted participants"
                      : "Register to see who else is attending."}
                  </p>
                </div>
                {canManageEvent && canShowAttendanceButton && (
                  <Button
                    variant="primary"
                    icon={IoQrCodeOutline}
                    onClick={() => setShowAttendanceModal(true)}
                    className="shrink-0"
                  >
                    Take Attendance
                  </Button>
                )}
              </div>
              
              {canViewParticipants && (
                <div className="flex flex-wrap gap-2 sm:gap-3">
                  {PARTICIPANT_TABS.map((tab) => (
                    <Button
                      key={tab.key}
                      variant="secondary"
                      size={{ default: 'small', md: 'small' }}
                      onClick={() => setActiveParticipantTab(tab.key)}
                      className={`${
                        activeParticipantTab === tab.key
                          ? "bg-gray-900 text-white border-gray-900"
                          : "text-gray-600 border-gray-200 dark:border-gray-700 hover:border-gray-400"
                      }`}
                    >
                      {tab.label} ({participantBuckets[tab.key]?.length || 0})
                    </Button>
                  ))}
                </div>
              )}
            </div>

            {participantsLoading && (
              <div className="py-10 text-center text-gray-500">
                Loading participant list...
              </div>
            )}

            {!participantsLoading && canViewParticipants && (
              <div className="space-y-3">
                {(participantBuckets[activeParticipantTab] || []).length ===
                0 ? (
                  <div className="text-center text-sm text-gray-500 py-8">
                    No participants with this status yet.
                  </div>
                ) : (
                  participantBuckets[activeParticipantTab].map(
                    (participant, index) => {
                      const participantKey =
                        participant.participant_id ??
                        `${participant.user_id}-${participant.status}-${participant.registration_date}-${index}`;
                      return (
                        <div
                          key={participantKey}
                          className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-700"
                        >
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {participant.name || participant.user_uid}
                            </p>
                            <p className="text-xs text-gray-500">
                              Registered{" "}
                              {formatDate(
                                participant.registration_date,
                                "MMM dd, yyyy"
                              )}
                            </p>
                          </div>
                          <span className="text-sm font-medium capitalize text-gray-600 dark:text-gray-300">
                            {participant.status?.replace("_", " ")}
                          </span>
                        </div>
                      );
                    }
                  )
                )}
                {participantsVisibility === "limited" && (
                  <p className="text-xs text-gray-400 text-center pt-2">
                    Showing limited participant details. Become an event manager
                    to see full contact information.
                  </p>
                )}
              </div>
            )}

            {!participantsLoading && !canViewParticipants && (
              <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-6 text-center">
                <IoPeopleOutline className="mx-auto text-3xl text-gray-400 mb-3" />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Register for this event to see who else is attending.
                </p>
              </div>
            )}

            {participantError && (
              <p className="text-sm text-red-500 mt-3">{participantError}</p>
            )}
          </section>
        </div>

        {/* Sidebar - Right Side on Medium+ Screens */}
        <div className="space-y-4 sm:space-y-6 h-fit">
          {/* Share Section */}
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 sm:p-6 space-y-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Share & insight
              </p>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Spread the word
              </h3>
            </div>
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-sm text-gray-600 dark:text-gray-300 break-all">
              {shareUrl || "Loading link..."}
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="secondary"
                icon={IoCopyOutline}
                onClick={handleCopyLink}
                size="medium"
                className="flex-1"
              >
                Copy link
              </Button>
              <Button
                variant="primary"
                icon={IoShareSocialOutline}
                onClick={() =>
                  notify?.push(
                    "Use your preferred channel to share the link.",
                    "info"
                  )
                }
                size="medium"
                className="flex-1"
              >
                Share
              </Button>
            </div>
          </div>

          {/* Participation Section */}
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 sm:p-6 space-y-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Participation
              </p>
              <h3 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
                {participantSummary}
              </h3>
              {eventData.max_participants && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {Math.round(
                    Math.min(
                      100,
                      ((eventData.participant_count || 0) /
                        eventData.max_participants) *
                        100
                    )
                  )}
                  % capacity filled
                </p>
              )}
              {eventData.waitlist_count > 0 && (
                <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                  {eventData.waitlist_count} on waitlist
                </p>
              )}
            </div>
            {eventData.status === "published" && (
              <JoinEventButton
                event={eventData}
                isRegistered={eventData.is_registered}
                participationStatus={eventData.participation_status}
                waitlistPosition={eventData.waitlist_position}
                onStatusChange={mutatingParticipantCount}
              />
            )}
          </div>

          {/* Contact Section */}
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 sm:p-6 space-y-3">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <IoMailOutline /> Contact
            </h3>
            {eventData.contact_email ? (
              <a
                href={`mailto:${eventData.contact_email}`}
                className="flex items-center gap-2 text-sm text-(--primary-red) hover:underline break-all"
              >
                <IoMailOutline /> {eventData.contact_email}
              </a>
            ) : (
              <p className="text-sm text-gray-500">
                No contact email provided.
              </p>
            )}
            {eventData.contact_phone ? (
              <a
                href={`tel:${eventData.contact_phone}`}
                className="flex items-center gap-2 text-sm text-(--primary-red) hover:underline"
              >
                <IoCallOutline /> {eventData.contact_phone}
              </a>
            ) : (
              <p className="text-sm text-gray-500">
                No contact number provided.
              </p>
            )}
          </div>
        </div>
      </div>

      {canManageEvent && (
        <div className="mt-6 flex flex-col gap-6">
          <EventReportsPanel eventUid={eventUid} currentUser={currentUser} />
        </div>
      )}

      {/* --- ATTENDANCE MODAL (Using ModalShell) --- */}
      <Modal
        isOpen={showAttendanceModal}
        onClose={() => setShowAttendanceModal(false)}
        title="Attendance Management"
        description={eventData?.title}
        size="lg"
      >
        {/* Fixed height container allows internal scroll of AttendancePanel to work properly */}
        <div className="h-[75vh] sm:h-[80vh] w-full">
          <AttendancePanel eventUid={eventUid} />
        </div>
      </Modal>

      {canEditEvent && (
        <>
          <PostponeEventModal
            isOpen={showPostponeModal}
            eventTitle={eventData?.title}
            defaultDate={
              eventData?.postponed_until || eventData?.start_datetime
            }
            onClose={() => setShowPostponeModal(false)}
            onSubmit={handlePostponeEvent}
            isSubmitting={isActionLoading}
            mode="auto"
          />

          <ArchiveEventConfirmModal
            isOpen={showArchiveModal}
            eventTitle={eventData?.title}
            onCancel={() => setShowArchiveModal(false)}
            onConfirm={handleArchiveEvent}
            isSubmitting={isActionLoading}
            mode="auto"
          />
          <CancelEventConfirmModal
            isOpen={showCancelModal}
            eventTitle={eventData?.title}
            onCancel={() => setShowCancelModal(false)}
            onConfirm={handleCancelEvent}
            isSubmitting={isActionLoading}
            mode="auto"
          />
        </>
      )}
    </div>
  );
}