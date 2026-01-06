"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import {
  IoDocumentTextOutline,
  IoDownloadOutline,
  IoRefreshOutline,
  IoPeopleOutline,
  IoTimeOutline,
  IoStatsChartOutline,
  IoTrophyOutline,
  IoLocationOutline,
  IoPersonOutline,
  IoCheckmarkCircleOutline,
  IoCloseCircleOutline,
  IoAlertCircleOutline,
  IoHourglassOutline,
} from "react-icons/io5";
import Button from "@/components/ui/Button";
import { useNotify } from "@/components/ui/NotificationProvider";
import { getEventAnalyticsReport, regenerateEventAnalyticsReport, downloadEventAnalyticsReportPdf } from "@/services/eventService";

/**
 * Format percentage with color based on value
 */
function getAttendanceColor(rate) {
  if (rate >= 80) return "text-green-600 dark:text-green-400";
  if (rate >= 60) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

/**
 * Format date for display
 */
function formatDate(date, pattern = "MMM d, yyyy h:mm a") {
  if (!date) return "N/A";
  try {
    return format(new Date(date), pattern);
  } catch {
    return "N/A";
  }
}

/**
 * Progress bar component for demographic breakdowns
 */
function ProgressBar({ value, max, color = "bg-primary-red" }) {
  const percentage = max > 0 ? (value / max) * 100 : 0;
  
  return (
    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${Math.min(percentage, 100)}%` }}
      />
    </div>
  );
}

/**
 * Metric card component
 */
function MetricCard({ icon: Icon, label, value, subValue, color = "text-gray-900 dark:text-white" }) {
  return (
    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 flex flex-col items-center text-center">
      <Icon className={`w-6 h-6 mb-2 ${color}`} />
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{label}</div>
      {subValue && (
        <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{subValue}</div>
      )}
    </div>
  );
}

/**
 * Demographics section component
 */
function DemographicsSection({ title, data, colorClass = "bg-primary-red" }) {
  if (!data || Object.keys(data).length === 0) {
    return null;
  }

  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((sum, [, count]) => sum + count, 0);

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{title}</h4>
      <div className="space-y-2">
        {entries.map(([label, count]) => {
          const pct = total > 0 ? ((count / total) * 100).toFixed(0) : 0;
          return (
            <div key={label} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-600 dark:text-gray-400">{label}</span>
                <span className="text-gray-500 dark:text-gray-500">{count} ({pct}%)</span>
              </div>
              <ProgressBar value={count} max={total} color={colorClass} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * EventReportPanel Component
 * 
 * Displays comprehensive post-event analytics for completed events.
 * Matches the EventDetailsPage container styling (rounded-2xl, border-gray-200, dark mode).
 * 
 * @param {Object} props
 * @param {string} props.eventUid - Event UID
 * @param {Object} props.currentUser - Current user object
 * @param {boolean} props.canManage - Whether user can manage (admin/staff)
 * @param {Object} props.eventData - Event data object
 */
export default function EventReportPanel({ eventUid, currentUser, canManage, eventData }) {
  const notify = useNotify();
  const [report, setReport] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState(null);

  // Only show for completed events
  const isEventCompleted = (eventData?.status || "").toLowerCase() === "completed";

  const loadReport = useCallback(async () => {
    if (!eventUid || !isEventCompleted) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await getEventAnalyticsReport(eventUid);
      setReport(response.data);
    } catch (err) {
      console.error("Failed to load analytics report:", err);
      if (err.message?.includes("404") || err.message?.includes("not found")) {
        // No report yet - that&apos;s OK
        setError(null);
        setReport(null);
      } else {
        setError(err.message || "Failed to load report");
      }
    } finally {
      setIsLoading(false);
    }
  }, [eventUid, isEventCompleted]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const handleRegenerate = async () => {
    if (!eventUid) return;

    setIsRegenerating(true);
    try {
      const response = await regenerateEventAnalyticsReport(eventUid);
      setReport(response.data);
      notify?.push("Report regenerated successfully", "success");
    } catch (err) {
      console.error("Failed to regenerate report:", err);
      notify?.push(err.message || "Failed to regenerate report", "error");
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!eventUid) return;

    setIsDownloading(true);
    try {
      await downloadEventAnalyticsReportPdf(eventUid);
      notify?.push("PDF download started", "success");
    } catch (err) {
      console.error("Failed to download PDF:", err);
      notify?.push(err.message || "Failed to download PDF", "error");
    } finally {
      setIsDownloading(false);
    }
  };

  // Don&apos;t render if event is not completed
  if (!isEventCompleted) {
    return null;
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded-xl" />
            <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-6">
        <div className="text-center py-8">
          <IoAlertCircleOutline className="w-12 h-12 mx-auto text-red-500 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Failed to Load Report
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{error}</p>
          <Button
            variant="secondary"
            icon={IoRefreshOutline}
            onClick={loadReport}
            size="small"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // Empty state - no report yet
  if (!report) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-6">
        <div className="text-center py-8">
          <IoDocumentTextOutline className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No Report Available
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            The analytics report for this event hasn&apos;t been generated yet.
          </p>
          {canManage && (
            <Button
              variant="primary"
              icon={IoRefreshOutline}
              onClick={handleRegenerate}
              loading={isRegenerating}
              size="small"
            >
              Generate Report
            </Button>
          )}
        </div>
      </div>
    );
  }

  const { attendance = {}, timing = {}, demographics = {}, engagement = {} } = report;

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-red/10 rounded-lg">
            <IoStatsChartOutline className="w-5 h-5 text-primary-red" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Event Analytics Report
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Generated {formatDate(report.generated_at)}
              {report.is_auto_generated && " (auto)"}
            </p>
          </div>
        </div>
        
        {canManage && (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              icon={IoRefreshOutline}
              onClick={handleRegenerate}
              loading={isRegenerating}
              size="small"
              title="Regenerate Report"
            >
              <span className="hidden sm:inline">Regenerate</span>
            </Button>
            <Button
              variant="primary"
              icon={IoDownloadOutline}
              onClick={handleDownloadPdf}
              loading={isDownloading}
              size="small"
            >
              <span className="hidden sm:inline">Download PDF</span>
              <span className="sm:hidden">PDF</span>
            </Button>
          </div>
        )}
      </div>

      <div className="p-6 space-y-6">
        {/* Attendance Overview */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
            <IoPeopleOutline className="w-4 h-4" />
            Attendance Overview
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard
              icon={IoPersonOutline}
              label="Registered"
              value={attendance.total_registered || 0}
            />
            <MetricCard
              icon={IoCheckmarkCircleOutline}
              label="Attended"
              value={attendance.total_attended || 0}
              color="text-green-600 dark:text-green-400"
            />
            <MetricCard
              icon={IoStatsChartOutline}
              label="Attendance Rate"
              value={`${attendance.attendance_rate || 0}%`}
              color={getAttendanceColor(attendance.attendance_rate || 0)}
            />
            <MetricCard
              icon={IoHourglassOutline}
              label="Waitlisted"
              value={attendance.total_waitlisted || 0}
              color="text-yellow-600 dark:text-yellow-400"
            />
          </div>
          
          {/* Additional attendance stats */}
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <IoCheckmarkCircleOutline className="w-3.5 h-3.5 text-green-500" />
              On-time: {timing.on_time_checkins || 0}
            </span>
            <span className="flex items-center gap-1">
              <IoTimeOutline className="w-3.5 h-3.5 text-yellow-500" />
              Late: {attendance.total_late || 0}
            </span>
            <span className="flex items-center gap-1">
              <IoCloseCircleOutline className="w-3.5 h-3.5 text-red-500" />
              No-show: {attendance.total_no_show || 0}
            </span>
            <span className="flex items-center gap-1">
              <IoAlertCircleOutline className="w-3.5 h-3.5 text-gray-400" />
              Cancelled: {attendance.total_cancelled || 0}
            </span>
          </div>
        </div>

        {/* Timing Analytics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <IoTimeOutline className="w-4 h-4" />
              Check-in Timing
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">First check-in</span>
                <span className="text-gray-900 dark:text-white font-medium">
                  {formatDate(timing.first_checkin, "h:mm a")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Last check-in</span>
                <span className="text-gray-900 dark:text-white font-medium">
                  {formatDate(timing.last_checkin, "h:mm a")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Avg. arrival</span>
                <span className="text-gray-900 dark:text-white font-medium">
                  {timing.avg_minutes_from_start != null
                    ? timing.avg_minutes_from_start < 0
                      ? `${Math.abs(timing.avg_minutes_from_start).toFixed(0)} min early`
                      : timing.avg_minutes_from_start === 0
                        ? "Right on time"
                        : `${timing.avg_minutes_from_start.toFixed(0)} min late`
                    : "N/A"}
                </span>
              </div>
            </div>
          </div>

          {/* Engagement Metrics */}
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <IoTrophyOutline className="w-4 h-4" />
              Engagement
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Points Awarded</span>
                <span className="text-primary-red font-bold">{engagement.total_points_awarded || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Badges Earned</span>
                <span className="text-green-600 dark:text-green-400 font-medium">
                  {engagement.badges_earned || 0}
                </span>
              </div>
              {engagement.feedback_count > 0 && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Feedback Submissions</span>
                    <span className="text-gray-900 dark:text-white font-medium">
                      {engagement.feedback_count}
                    </span>
                  </div>
                  {engagement.avg_rating && (
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Average Rating</span>
                      <span className="text-yellow-500 font-medium">
                        {engagement.avg_rating.toFixed(1)} / 5
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Demographics - only show if we have full access (admin/staff) */}
        {canManage && demographics && (Object.keys(demographics.age || {}).length > 0 || 
         Object.keys(demographics.gender || {}).length > 0 ||
         Object.keys(demographics.role || {}).length > 0) && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
              <IoPeopleOutline className="w-4 h-4" />
              Participant Demographics
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <DemographicsSection 
                title="Age Distribution" 
                data={demographics.age} 
                colorClass="bg-primary-red"
              />
              <DemographicsSection 
                title="Gender Distribution" 
                data={demographics.gender} 
                colorClass="bg-blue-500"
              />
              <DemographicsSection 
                title="Role Distribution" 
                data={demographics.role} 
                colorClass="bg-green-500"
              />
            </div>
          </div>
        )}

        {/* Location Distribution - only for admin/staff */}
        {canManage && demographics?.location && Object.keys(demographics.location).length > 0 && (
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <IoLocationOutline className="w-4 h-4" />
              Location Breakdown
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
              {Object.entries(demographics.location)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 6)
                .map(([loc, count]) => {
                  const total = Object.values(demographics.location).reduce((a, b) => a + b, 0);
                  const pct = total > 0 ? ((count / total) * 100).toFixed(0) : 0;
                  return (
                    <div key={loc} className="flex justify-between text-sm py-1">
                      <span className="text-gray-600 dark:text-gray-400 truncate mr-2">{loc}</span>
                      <span className="text-gray-900 dark:text-white font-medium whitespace-nowrap">
                        {count} ({pct}%)
                      </span>
                    </div>
                  );
                })}
            </div>
            {Object.keys(demographics.location).length > 6 && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                + {Object.keys(demographics.location).length - 6} more locations
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
