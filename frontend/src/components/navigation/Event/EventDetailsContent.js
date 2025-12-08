"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import EventDetailsPage from "@/components/events/EventDetailsPage";
import { useNotify } from "@/components/ui/NotificationProvider";

export default function EventDetailsContent({ currentUser, onNavigate }) {
  const notify = useNotify();
  const searchParams = useSearchParams();
  const eventUid = searchParams.get("eventUid");
  const initialEdit = searchParams.get("edit") === "true";
  const initialCancel = searchParams.get("cancel") === "true";
  const normalizedRole = (currentUser?.role || "volunteer").toLowerCase();
  const fallbackContent =
    normalizedRole === "admin" || normalizedRole === "staff"
      ? "manage-events"
      : "dashboard";
  const fallbackSubContent = null;

  useEffect(() => {
    if (eventUid) {
      return;
    }

    notify?.push("Select an event from the list to view its details.", "info");

    if (typeof onNavigate === "function") {
      onNavigate(fallbackContent, fallbackSubContent, {
        replace: true,
      });
    }
  }, [eventUid, fallbackContent, fallbackSubContent, notify, onNavigate]);

  if (!eventUid) {
    return null;
  }

  return (
    <EventDetailsPage
      eventUid={eventUid}
      currentUser={currentUser}
      initialEdit={initialEdit}
      initialCancel={initialCancel}
    />
  );
}
