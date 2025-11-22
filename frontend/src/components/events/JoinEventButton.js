"use client";

import { useState, useEffect } from "react";
import { joinEvent, leaveEvent } from "../../services/eventService";
import { useNotify } from "../ui/NotificationProvider";

export default function JoinEventButton({
  event,
  isRegistered: initialIsRegistered,
  onStatusChange,
}) {
  const [isRegistered, setIsRegistered] = useState(initialIsRegistered);
  const [isLoading, setIsLoading] = useState(false);
  const notify = useNotify();

  useEffect(() => {
    setIsRegistered(initialIsRegistered);
  }, [initialIsRegistered]);

  const handleJoin = async () => {
    try {
      setIsLoading(true);
      const response = await joinEvent(event.uid);

      setIsRegistered(true);
      notify?.push(
        response.message || "Successfully joined the event",
        "success"
      );

      if (onStatusChange) {
        onStatusChange(true);
      }
    } catch (error) {
      console.error("Error joining event:", error);
      notify?.push(error.message || "Failed to join event", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeave = async () => {
    if (!confirm("Are you sure you want to leave this event?")) {
      return;
    }

    try {
      setIsLoading(true);
      const response = await leaveEvent(event.uid);

      setIsRegistered(false);
      notify?.push(
        response.message || "Successfully left the event",
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

  return (
    <button
      onClick={handleJoin}
      disabled={isLoading || isFull}
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
