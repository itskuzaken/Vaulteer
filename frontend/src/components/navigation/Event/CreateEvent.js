"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { createEvent, publishEvent } from "../../../services/eventService";
import EventForm from "@/components/events/EventForm";
import { useNotify } from "@/components/ui/NotificationProvider";
import { useDashboardUser } from "@/hooks/useDashboardUser";
import { buildDashboardQueryPath } from "@/utils/dashboardRouteHelpers";

export default function CreateEvent({ onBack, onSuccess, onNavigate }) {
  const router = useRouter();
  const notify = useNotify();
  const { user } = useDashboardUser();

  const navigateToManageEvents = useCallback(() => {
    if (typeof onNavigate === "function") {
      onNavigate("manage-events", null, { replace: true });
      return;
    }

    const targetPath = buildDashboardQueryPath(user?.role || "admin", {
      content: "manage-events",
    });
    router.push(targetPath);
  }, [onNavigate, router, user?.role]);

  const handleCompletion = useCallback(() => {
    if (typeof onSuccess === "function") {
      onSuccess();
      return;
    }
    navigateToManageEvents();
  }, [navigateToManageEvents, onSuccess]);

  const handleSaveDraft = async (payload) => {
    try {
      await createEvent(payload);
      notify?.push("Event saved as draft successfully!", "success");
      handleCompletion();
    } catch (error) {
      console.error("Error creating event:", error);
      notify?.push(error.message || "Failed to create event", "error");
      throw error;
    }
  };

  const handlePublish = async (payload) => {
    try {
      const response = await createEvent(payload);
      const createdEvent = response.data;
      if (createdEvent?.uid) {
        await publishEvent(createdEvent.uid);
      }
      notify?.push("Event created and published successfully!", "success");
      handleCompletion();
    } catch (error) {
      console.error("Error publishing event:", error);
      notify?.push(error.message || "Failed to publish event", "error");
      throw error;
    }
  };

  return (
    <EventForm
      mode="create"
      onBack={onBack ?? navigateToManageEvents}
      onSaveDraft={handleSaveDraft}
      onPublish={handlePublish}
      onValidationError={() =>
        notify?.push("Please fix the errors in the form", "error")
      }
    />
  );
}
