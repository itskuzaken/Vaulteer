"use client";

import { useState, useEffect } from "react";
import { useDashboardUser } from "@/hooks/useDashboardUser";
import { joinEvent, leaveEvent } from "../../services/eventService";
import { useNotify } from "../ui/NotificationProvider";

export default function JoinEventButton({
  event,
  isRegistered: initialIsRegistered,
  participationStatus: initialParticipationStatus,
  waitlistPosition,
  onStatusChange,
}) {
  // Use participationStatus if provided, otherwise fall back to isRegistered boolean
  const [participationStatus, setParticipationStatus] = useState(
    initialParticipationStatus || (initialIsRegistered ? "registered" : null)
  );
  const [isLoading, setIsLoading] = useState(false);
  const notify = useNotify();
  const { user: dashboardUser } = useDashboardUser();
  const dashboardRole = (dashboardUser?.role || "").toLowerCase();
  const isAdmin = dashboardRole === "admin";
  const isStaff = dashboardRole === "staff";

  useEffect(() => {
    if (initialParticipationStatus !== undefined) {
      setParticipationStatus(initialParticipationStatus);
    } else {
      setParticipationStatus(initialIsRegistered ? "registered" : null);
    }
  }, [initialIsRegistered, initialParticipationStatus]);

  // Derive boolean states from participation status
  const isRegistered = participationStatus === "registered";
  const isWaitlisted = participationStatus === "waitlisted";

  const handleJoin = async () => {
    try {
      setIsLoading(true);
      const response = await joinEvent(event.uid);

      // Update participation status based on server response
      const newStatus = response.data?.status || "registered";
      setParticipationStatus(newStatus);
      
      notify?.push(
        response.message || 
        (newStatus === "waitlisted" ? "Added to waitlist" : "Successfully joined the event"),
        "success"
      );

      if (onStatusChange) {
        // Backwards compatible: also pass a detailed status object and request a refresh
        try {
          onStatusChange(newStatus === "registered", { status: newStatus, refresh: true });
        } catch (e) {
          // If parent expects only one arg, the above still works (extra arg ignored)
          onStatusChange(newStatus === "registered");
        }
      }
    } catch (error) {
      console.error("Error joining event:", error);
      const msg = error?.message || "Failed to join event";

      // If backend reports the user is already registered (race/stale UI),
      // treat as info and update local state to reflect reality so UI shows "Leave Event"
      if (/already registered/i.test(msg)) {
        setParticipationStatus("registered");
        if (onStatusChange) {
          try {
            onStatusChange(true, { status: "registered" });
          } catch (e) {
            onStatusChange(true);
          }
        }
        notify?.push("You are already registered for this event", "info");
      } else {
        notify?.push(msg, "error");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeave = async () => {
    try {
      setIsLoading(true);
      const response = await leaveEvent(event.uid);

      setParticipationStatus(null);
      
      notify?.push("Successfully left the event", "success");

      if (onStatusChange) {
        try {
          onStatusChange(false, { status: null, wasWaitlisted: isWaitlisted, refresh: true });
        } catch (e) {
          onStatusChange(false);
        }
      }
    } catch (error) {
      console.error("Error leaving event:", error);
      notify?.push(error.message || "Failed to leave event", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Check if event is full
  const isFull =
    event.max_participants && event.participant_count >= event.max_participants;

  // Check if registration deadline passed
  const deadlinePassed =
    event.registration_deadline &&
    new Date(event.registration_deadline) < new Date();

  // Check if event has already started or completed
  const eventStarted = new Date(event.start_datetime) < new Date();
  const eventEnded =
    event.end_datetime && new Date(event.end_datetime) < new Date();
  const eventCompleted =
    event.status === "completed" || event.status === "archived" || eventEnded;

  // Build button element depending on participation and event state so modals can be rendered consistently

  let buttonElement = null;

  if (eventCompleted) {
    buttonElement = (
      <button
        disabled
        className="w-full px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400 rounded-lg text-sm font-medium cursor-not-allowed"
      >
        Event Completed
      </button>
    );
  } else if (deadlinePassed && !isRegistered) {
    buttonElement = (
      <button
        disabled
        className="w-full px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400 rounded-lg text-sm font-medium cursor-not-allowed"
      >
        Registration Closed
      </button>
    );
  } else if (isWaitlisted) {
    buttonElement = (
      <div className="space-y-2">
        {waitlistPosition && (
          <p className="text-sm text-amber-600 dark:text-amber-400 text-center">
            Waitlist position: #{waitlistPosition}
          </p>
        )}
        <button
          onClick={handleLeave}
          disabled={isLoading}
          className="w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-amber-600 hover:bg-amber-700 text-white"
        >
          {isLoading ? "Processing..." : "Leave Waitlist"}
        </button>
      </div>
    );
  } else if (isRegistered) {
    buttonElement = (
      <button
        onClick={handleLeave}
        disabled={isLoading || eventStarted}
        className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
          eventStarted
            ? "bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400 cursor-not-allowed"
            : "bg-red-600 hover:bg-red-700 text-white"
        }`}
      >
        {isLoading
          ? "Processing..."
          : eventStarted
          ? "Already Started"
          : "Leave Event"}
      </button>
    );
  } else {
    // Not registered or waitlisted - allow joining
    const joinDisabled = isLoading || isAdmin || isStaff || eventStarted || eventCompleted;
    const joinLabel = isLoading
      ? "Processing..."
      : eventCompleted
      ? "Event Completed"
      : eventStarted
      ? "Already Started"
      : isFull
      ? "Join Waitlist"
      : "Join Event";

    const joinButtonClass = isAdmin || isStaff || eventStarted
      ? "bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400 cursor-not-allowed"
      : isFull
      ? "bg-amber-500 text-white"
      : "bg-[var(--primary-red)] hover:bg-red-700 text-white";

    buttonElement = (
      <button
        onClick={handleJoin}
        disabled={joinDisabled}
        className={`w-full px-4 py-2 rounded-lg text-sm font-medium ${joinButtonClass}`}
      >
        {joinLabel}
      </button>
    );
  }

  return (
    <>
      {buttonElement}
    </>
  );
}
