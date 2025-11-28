"use client";

import { useState, useEffect } from "react";
import { joinEvent, leaveEvent } from "../../services/eventService";
import { useNotify } from "../ui/NotificationProvider";

export default function JoinEventButton({
  event,
  isRegistered: initialIsRegistered,
  participationStatus: initialParticipationStatus,
  onStatusChange,
}) {
  // Use participationStatus if provided, otherwise fall back to isRegistered boolean
  const [participationStatus, setParticipationStatus] = useState(
    initialParticipationStatus || (initialIsRegistered ? "registered" : null)
  );
  const [isLoading, setIsLoading] = useState(false);
  const notify = useNotify();

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
        onStatusChange(newStatus === "registered");
      }
    } catch (error) {
      console.error("Error joining event:", error);
      notify?.push(error.message || "Failed to join event", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeave = async () => {
    const confirmMessage = isWaitlisted
      ? "Are you sure you want to leave the waitlist?"
      : "Are you sure you want to leave this event?";
    
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      setIsLoading(true);
      const response = await leaveEvent(event.uid);

      setParticipationStatus(null);
      notify?.push(
        response.message || 
        (isWaitlisted ? "Successfully left the waitlist" : "Successfully left the event"),
        "success"
      );

      if (onStatusChange) {
        onStatusChange(false);
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
  const eventCompleted =
    event.status === "completed" || event.status === "archived";

  if (eventCompleted) {
    return (
      <button
        disabled
        className="w-full px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400 rounded-lg text-sm font-medium cursor-not-allowed"
      >
        Event Completed
      </button>
    );
  }

  if (deadlinePassed && !isRegistered) {
    return (
      <button
        disabled
        className="w-full px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400 rounded-lg text-sm font-medium cursor-not-allowed"
      >
        Registration Closed
      </button>
    );
  }

  // If user is on waitlist
  if (isWaitlisted) {
    return (
      <button
        onClick={handleLeave}
        disabled={isLoading}
        className="w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-amber-600 hover:bg-amber-700 text-white"
      >
        {isLoading ? "Processing..." : "Leave Waitlist"}
      </button>
    );
  }

  // If user is registered
  if (isRegistered) {
    return (
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
  }

  // Not registered or waitlisted - allow joining
  return (
    <button
      onClick={handleJoin}
      disabled={isLoading}
      className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        isFull
          ? "bg-amber-500 hover:bg-amber-600 text-white"
          : "bg-[var(--primary-red)] hover:bg-red-700 text-white"
      }`}
    >
      {isLoading ? "Processing..." : isFull ? "Join Waitlist" : "Join Event"}
    </button>
  );
}
