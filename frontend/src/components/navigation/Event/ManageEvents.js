"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useDashboardUser } from "@/hooks/useDashboardUser";
import { useNotify } from "@/components/ui/NotificationProvider";
import EventList from "@/components/events/EventList";
import { EVENT_STATUS_TABS } from "@/components/events/eventStatusConfig";
import { IoAddCircleOutline } from "react-icons/io5";
import { archiveEvent, postponeEvent, publishEvent } from "@/services/eventService";
import PostponeEventModal from "@/components/events/modals/PostponeEventModal";
import {
  buildDashboardQueryPath,
  buildEventDetailPath,
} from "@/utils/dashboardRouteHelpers";

const ACTION_METADATA = {
  postpone: { label: "Postpone" },
  edit: { label: "Edit" },
  cancel: { label: "Cancel" },
  archive: { label: "Archive" },
  publish: { label: "Publish" },
  resume: { label: "Resume" },
};

export default function ManageEvents({ onNavigate }) {
  const notify = useNotify();
  const router = useRouter();
  const { user, status: userStatus } = useDashboardUser();
  const dashboardRole = (user?.role || "").toLowerCase();
  const authReady = userStatus === "ready" && Boolean(user);
  const canManageEvents =
    authReady && (dashboardRole === "admin" || dashboardRole === "staff");

  const [activeTab, setActiveTab] = useState(EVENT_STATUS_TABS[0]?.key);
  const [refreshToken, setRefreshToken] = useState(0);
  const [postponeTarget, setPostponeTarget] = useState(null);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [inlineActionLoading, setInlineActionLoading] = useState(false);

  const activeConfig = useMemo(() => {
    return (
      EVENT_STATUS_TABS.find((tab) => tab.key === activeTab) ||
      EVENT_STATUS_TABS[0]
    );
  }, [activeTab]);

  const ActiveIcon = activeConfig?.icon;

  const statusFilter = useMemo(
    () => ({ status: activeConfig?.status || "" }),
    [activeConfig]
  );

  const triggerRefresh = useCallback(() => {
    setRefreshToken((prev) => prev + 1);
  }, []);

  const navigateToCreateEvent = useCallback(() => {
    if (!canManageEvents) return;
    if (typeof onNavigate === "function") {
      onNavigate("manage-events", "create-event");
      return;
    }

    const fallbackPath = buildDashboardQueryPath(user?.role, {
      content: "manage-events",
      subContent: "create-event",
    });
    router.push(fallbackPath);
  }, [canManageEvents, onNavigate, router, user?.role]);

  const navigateToEventDetail = useCallback(
    (eventUid, options = {}) => {
      if (!canManageEvents) return;
      if (typeof onNavigate === "function") {
        onNavigate("event", null, {
          extraParams: { eventUid, ...(options || {}) },
        });
        return;
      }

      const path = buildDashboardQueryPath(user?.role, {
        content: "event",
        params: { eventUid, ...(options || {}) },
      });
      router.push(path);
    },
    [canManageEvents, onNavigate, router, user?.role]
  );

  const runInlineMutation = useCallback(
    async (mutation, successMessage) => {
      setInlineActionLoading(true);
      try {
        await mutation();
        if (successMessage) {
          notify?.push(successMessage, "success");
        }
        triggerRefresh();
      } catch (error) {
        console.error("Event action failed", error);
        notify?.push(error?.message || "Action failed", "error");
      } finally {
        setInlineActionLoading(false);
      }
    },
    [notify, triggerRefresh]
  );

  const handleArchive = useCallback(
    (event) =>
      runInlineMutation(() => archiveEvent(event.uid), "Event archived"),
    [runInlineMutation]
  );

  const handlePublish = useCallback(
    (event, message = "Event published") =>
      runInlineMutation(() => publishEvent(event.uid), message),
    [runInlineMutation]
  );

  const managerActionsProvider = useCallback(
    (event) => {
      if (!canManageEvents) return [];
      return (activeConfig?.managerActions || [])
        .map((actionKey) => {
          const metadata = ACTION_METADATA[actionKey];
          if (!metadata) return null;
          switch (actionKey) {
            case "postpone":
              // Do not show postpone action for events that are already postponed
              if ((event.status || "").toLowerCase() === "postponed") return null;
              return {
                label: metadata.label,
                onAction: () => setPostponeTarget(event),
              };
            case "edit":
              // Do not allow editing of cancelled events
              if ((event.status || "").toLowerCase() === "cancelled") return null;
              return {
                label: metadata.label,
                onAction: () => navigateToEventDetail(event.uid, { edit: true }),
                disabled: inlineActionLoading,
              };
            case "cancel":
              return {
                label: metadata.label,
                onAction: () => navigateToEventDetail(event.uid, { cancel: true }),
                disabled: inlineActionLoading,
              };
            case "archive":
              return {
                label: metadata.label,
                onAction: () => handleArchive(event),
                disabled: inlineActionLoading,
              };
            case "publish":
              return {
                label: metadata.label,
                onAction: () => handlePublish(event),
                disabled: inlineActionLoading,
              };
            case "resume":
              return {
                label: metadata.label,
                onAction: () =>
                  handlePublish(event, "Event resumed and published"),
                disabled: inlineActionLoading,
              };
            // 'delete' option removed from manager actions as per UI change
            default:
              return null;
          }
        })
        .filter(Boolean);
    },
    [
      activeConfig?.managerActions,
      canManageEvents,
      handleArchive,
      handlePublish,
      inlineActionLoading,
    ]
  );

  const handleEventClick = useCallback(
    (eventUid) => {
      if (!eventUid) return;
      const targetPath = buildEventDetailPath(user?.role, eventUid);
      router.push(targetPath);
    },
    [router, user?.role]
  );

  const handlePostponeSubmit = useCallback(
    async (payload) => {
      if (!postponeTarget) return;
      setModalSubmitting(true);
      try {
        await postponeEvent(postponeTarget.uid, payload);
        notify?.push("Event postponed", "success");
        setPostponeTarget(null);
        triggerRefresh();
      } catch (error) {
        console.error("Failed to postpone event", error);
        notify?.push(error?.message || "Failed to postpone event", "error");
        throw error;
      } finally {
        setModalSubmitting(false);
      }
    },
    [notify, postponeTarget, triggerRefresh]
  );

  // Delete action removed: deleting events is not allowed from ManageEvents UI

  return (
    <>
      <div className="flex justify-center w-full">
        <div className="w-full max-w-7xl px-4 sm:px-6 lg:px-0">
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-md overflow-hidden">
            <div className="p-4 md:p-6 space-y-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-4">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-600 ring-8 ring-red-100/60 dark:bg-red-900/40 dark:text-red-100 dark:ring-red-900/10">
                    {ActiveIcon ? <ActiveIcon className="h-6 w-6" /> : null}
                  </span>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {activeConfig?.label || "Event oversight"}
                    </h1>
                    {activeConfig?.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {activeConfig.description}
                      </p>
                    )}
                  </div>
                </div>

                {canManageEvents && (
                  <button
                    type="button"
                    onClick={navigateToCreateEvent}
                    className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-5 py-2 text-sm font-semibold text-gray-800 shadow-sm transition-all hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                  >
                    <IoAddCircleOutline className="h-5 w-5" />
                    <span>Create Event</span>
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {EVENT_STATUS_TABS.map((tab) => {
                  const isActive = tab.key === activeTab;
                  const TabIcon = tab.icon;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveTab(tab.key)}
                      className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                        isActive
                          ? "border-gray-900 bg-gray-900 text-white shadow-lg shadow-gray-800/40 dark:border-white dark:bg-white dark:text-gray-900"
                          : "border-transparent bg-gray-100 text-gray-600 hover:border-gray-300 hover:text-gray-900 dark:bg-gray-800 dark:text-gray-300"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        {TabIcon ? <TabIcon className="h-4 w-4" /> : null}
                        {tab.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="border-t border-gray-100 dark:border-gray-700" />

              <EventList
                defaultFilters={statusFilter}
                lockedFilters={statusFilter}
                managerActionsProvider={managerActionsProvider}
                emptyState={activeConfig?.emptyState}
                canManageEvents={canManageEvents}
                onEventClick={handleEventClick}
                refreshToken={refreshToken}
                authReady={authReady}
              />
            </div>
          </div>
        </div>
      </div>

      {canManageEvents && (
        <>
          <PostponeEventModal
            isOpen={Boolean(postponeTarget)}
            eventTitle={postponeTarget?.title}
            defaultDate={
              postponeTarget?.postponed_until || postponeTarget?.start_datetime
            }
            onClose={() => setPostponeTarget(null)}
            onSubmit={handlePostponeSubmit}
            isSubmitting={modalSubmitting}
          />

          {/* DeleteEventConfirmModal removed from ManageEvents UI */}
        </>
      )}
    </>
  );
}
