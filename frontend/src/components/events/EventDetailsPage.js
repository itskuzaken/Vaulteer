"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
  IoDocumentTextOutline,
  IoAlertCircleOutline,
} from "react-icons/io5";
import { useNotify } from "@/components/ui/NotificationProvider";
import EventStatusBadge from "@/components/events/EventStatusBadge";
import JoinEventButton from "@/components/events/JoinEventButton";
import {
  deleteEvent,
  getEventDetails,
  getEventParticipants,
  updateEvent,
  publishEvent,
  postponeEvent,
} from "@/services/eventService";
import { buildEventDetailPath } from "@/utils/dashboardRouteHelpers";
import EventForm, { mapEventToFormValues } from "@/components/events/EventForm";
import PostponeEventModal from "@/components/events/modals/PostponeEventModal";
import DeleteEventConfirmModal from "@/components/events/modals/DeleteEventConfirmModal";

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

export default function EventDetailsPage({ eventUid, currentUser }) {
  const router = useRouter();
  const notify = useNotify();
  const [eventData, setEventData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [participantsVisibility, setParticipantsVisibility] = useState("none");
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [participantError, setParticipantError] = useState(null);
  const [activeParticipantTab, setActiveParticipantTab] =
    useState("registered");
  const [isEditing, setIsEditing] = useState(false);
  const [showPostponeModal, setShowPostponeModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const role = (currentUser?.role || "volunteer").toLowerCase();
  const canManageEvent = role === "admin" || role === "staff";
  const isPostponed = (eventData?.status || "").toLowerCase() === "postponed";

  const sharePath = useMemo(() => {
    if (!eventUid) return null;
    return buildEventDetailPath(currentUser?.role, eventUid);
  }, [currentUser?.role, eventUid]);

  const shareUrl = useMemo(() => {
    if (typeof window === "undefined" || !sharePath) return "";
    return `${window.location.origin}${sharePath}`;
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

  const mutatingParticipantCount = useCallback((isRegistered) => {
    setEventData((prev) => {
      if (!prev) return prev;
      const prevCount =
        typeof prev.participant_count === "number" ? prev.participant_count : 0;
      const nextCount = isRegistered
        ? prevCount + 1
        : Math.max(0, prevCount - 1);
      return {
        ...prev,
        is_registered: isRegistered,
        participant_count: nextCount,
      };
    });
  }, []);

  const loadEventDetails = useCallback(async () => {
    if (!eventUid) return;
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
    if (!eventData) return;
    loadParticipants();
  }, [eventData, loadParticipants]);

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
    if (!canManageEvent) return;
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

  const handleDeleteEvent = useCallback(async () => {
    if (!eventUid) return;
    setIsActionLoading(true);
    try {
      await deleteEvent(eventUid);
      notify?.push("Event deleted", "success");
      setShowDeleteModal(false);
      router.back();
    } catch (err) {
      console.error("Failed to delete event", err);
      notify?.push(err?.message || "Failed to delete event", "error");
    } finally {
      setIsActionLoading(false);
    }
  }, [eventUid, notify, router]);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-64 bg-gray-200 dark:bg-gray-800 rounded" />
        <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="h-48 bg-gray-200 dark:bg-gray-800 rounded-xl" />
          <div className="h-48 bg-gray-200 dark:bg-gray-800 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !eventData) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-10 text-center">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">
          Unable to load event
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {error ||
            "This event could not be found or you might not have permission to view it."}
        </p>
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-gray-900 text-white hover:bg-gray-800"
        >
          <IoArrowBackOutline /> Return to previous page
        </button>
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
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900"
        >
          <IoArrowBackOutline className="text-lg" /> Back to previous view
        </button>
        <div className="flex flex-wrap items-center gap-3">
          {eventData.status && <EventStatusBadge status={eventData.status} />}
          {canManageEvent && (
            <>
              <button
                type="button"
                onClick={handleEditToggle}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                <IoPencilOutline /> {isEditing ? "Cancel" : "Edit event"}
              </button>
              <button
                type="button"
                onClick={() => setShowPostponeModal(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100 dark:border-amber-500 dark:bg-amber-900/30 dark:text-amber-100"
              >
                Pause / postpone
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                Delete event
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_360px]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
            <div className="relative h-72 w-full bg-gray-100 dark:bg-gray-800">
              {eventData.image_url ? (
                <Image
                  src={eventData.image_url}
                  alt={eventData.title}
                  fill
                  sizes="100vw"
                  className="object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
                  <IoCalendarOutline className="text-4xl" />
                  <p className="mt-2">No cover image</p>
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-6">
                <p className="text-sm text-white/80 uppercase tracking-wide">
                  {formatDate(eventData.start_datetime, "eeee, MMM dd")}
                </p>
                <h1 className="text-3xl font-semibold text-white">
                  {eventData.title}
                </h1>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6">
              <div className="rounded-xl bg-gray-50 dark:bg-gray-800/70 p-4 border border-gray-200 dark:border-gray-700">
                <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-2">
                  <IoCalendarOutline /> Schedule
                </p>
                <p className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">
                  {formatDate(eventData.start_datetime)}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2">
                  <IoTimeOutline />
                  {`${formatDate(
                    eventData.start_datetime,
                    "h:mm a"
                  )} – ${formatDate(eventData.end_datetime, "h:mm a")}`}
                </p>
                {eventData.registration_deadline && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Register until{" "}
                    {formatDate(
                      eventData.registration_deadline,
                      "MMM dd, yyyy p"
                    )}
                  </p>
                )}
              </div>

              <div className="rounded-xl bg-gray-50 dark:bg-gray-800/70 p-4 border border-gray-200 dark:border-gray-700">
                <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-2">
                  <IoLocationOutline /> Location
                </p>
                <p className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">
                  {eventData.location || "TBA"}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {eventData.location_type?.replace("_", " ")}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 flex items-center gap-2">
                  <IoPeopleOutline /> {participantSummary}
                </p>
              </div>

              <div className="rounded-xl bg-gray-50 dark:bg-gray-800/70 p-4 border border-gray-200 dark:border-gray-700">
                <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-2">
                  <IoDocumentTextOutline /> Host
                </p>
                <p className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">
                  {eventData.created_by_name || "Vaulteer"}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {eventData.created_by_email || "–"}
                </p>
              </div>
            </div>
          </section>

          {isPostponed && (
            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900 dark:border-amber-500 dark:bg-amber-900/20 dark:text-amber-100">
              <div className="flex items-start gap-3">
                <IoAlertCircleOutline className="mt-1 text-2xl" />
                <div>
                  <h2 className="text-lg font-semibold">
                    This event is currently postponed
                  </h2>
                  <p className="text-sm text-amber-900/80 dark:text-amber-100/80">
                    Participants will be notified once you publish the updated
                    schedule.
                  </p>
                </div>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-amber-800/70 dark:text-amber-100/70">
                    Estimated return
                  </p>
                  <p className="text-base font-semibold">
                    {eventData.postponed_until
                      ? `${formatDate(
                          eventData.postponed_until
                        )} · ${formatDate(eventData.postponed_until, "h:mm a")}`
                      : "Not set"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-amber-800/70 dark:text-amber-100/70">
                    Original schedule
                  </p>
                  <p className="text-base font-semibold">
                    {eventData.previous_start_datetime
                      ? `${formatDate(
                          eventData.previous_start_datetime
                        )} · ${formatDate(
                          eventData.previous_start_datetime,
                          "h:mm a"
                        )}`
                      : `${formatDate(eventData.start_datetime)} · ${formatDate(
                          eventData.start_datetime,
                          "h:mm a"
                        )}`}
                  </p>
                </div>
              </div>
              {eventData.postponed_reason && (
                <p className="mt-4 rounded-xl bg-white/70 p-4 text-sm font-medium text-amber-900 dark:bg-amber-900/40 dark:text-amber-50">
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

          <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <IoPricetagOutline /> Requirements
              </h3>
              <p className="mt-3 text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line">
                {eventData.requirements || "No special requirements listed."}
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <IoPricetagOutline /> Tags
              </h3>
              {eventData.tags && eventData.tags.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {eventData.tags.map((tag, index) => (
                    <span
                      key={`${tag}-${index}`}
                      className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
                  No tags added for this event.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
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
              {canViewParticipants && (
                <div className="flex flex-wrap gap-2">
                  {PARTICIPANT_TABS.map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveParticipantTab(tab.key)}
                      className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                        activeParticipantTab === tab.key
                          ? "bg-gray-900 text-white border-gray-900"
                          : "text-gray-600 border-gray-200 dark:border-gray-700 hover:border-gray-400"
                      }`}
                    >
                      {tab.label} ({participantBuckets[tab.key]?.length || 0})
                    </button>
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

        <aside className="space-y-4">
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 space-y-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Share & insight
              </p>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Spread the word
              </h3>
            </div>
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-sm text-gray-600 dark:text-gray-300 break-words">
              {shareUrl}
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleCopyLink}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <IoCopyOutline /> Copy link
              </button>
              <button
                type="button"
                onClick={() =>
                  notify?.push(
                    "Use your preferred channel to share the link.",
                    "info"
                  )
                }
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800"
              >
                <IoShareSocialOutline /> Share
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 space-y-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Participation
              </p>
              <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">
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
            </div>
            {eventData.status === "published" && (
              <JoinEventButton
                event={eventData}
                isRegistered={eventData.is_registered}
                onStatusChange={mutatingParticipantCount}
              />
            )}
          </div>

          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 space-y-3">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <IoMailOutline /> Contact
            </h3>
            {eventData.contact_email ? (
              <a
                href={`mailto:${eventData.contact_email}`}
                className="flex items-center gap-2 text-sm text-[var(--primary-red)] hover:underline"
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
                className="flex items-center gap-2 text-sm text-[var(--primary-red)] hover:underline"
              >
                <IoCallOutline /> {eventData.contact_phone}
              </a>
            ) : (
              <p className="text-sm text-gray-500">
                No contact number provided.
              </p>
            )}
          </div>
        </aside>
      </div>

      {canManageEvent && (
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
          />

          <DeleteEventConfirmModal
            isOpen={showDeleteModal}
            eventTitle={eventData?.title}
            onCancel={() => setShowDeleteModal(false)}
            onConfirm={handleDeleteEvent}
            isSubmitting={isActionLoading}
          />
        </>
      )}
    </div>
  );
}
