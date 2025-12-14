import { useState, useEffect } from "react";
import {
  getApplicationStatuses,
  getApplicantStatusHistory,
  updateApplicantStatus,
} from "../../services/applicantsService";
import StatusSelector from "./StatusSelector";
import StatusTimeline from "./StatusTimeline";
import StatusChangeConfirmModal from "./StatusChangeConfirmModal";
import InterviewScheduleModal from "./InterviewScheduleModal";

export default function ApplicantAdminControls({
  applicantId,
  currentStatus,
  onStatusChange,
  currentUserRole = "staff", // Default to staff, will be passed from parent
}) {
  const [statuses, setStatuses] = useState([]);
  const [history, setHistory] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState(currentStatus);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingStatus, setPendingStatus] = useState(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleData, setScheduleData] = useState(null);

  // NOTE: workflowOrder constant was removed as it was defined but unused.

  /**
   * Get allowed next statuses based on current status and user role
   */
  const getAllowedNextStatuses = (current) => {
    const normalized = (current || "").toLowerCase();
    const isAdmin = currentUserRole?.toLowerCase() === "admin";

    switch (normalized) {
      case "pending":
        return ["under_review", "rejected"];
      case "under_review":
        return ["interview_scheduled", "rejected"];
      case "interview_scheduled":
        // Admin and staff can approve or reject from interview stage
        return ["approved", "rejected"];
      case "approved":
        return []; // Final state, no changes allowed
      case "rejected":
        return []; // Final state, no changes allowed
      default:
        return [];
    }
  };

  /**
   * Check if a status transition is allowed
   */
  const isStatusAllowed = (newStatus) => {
    const allowedStatuses = getAllowedNextStatuses(currentStatus);
    return allowedStatuses.includes(newStatus);
  };

  /**
   * Get status description
   */
  const getStatusDescription = (statusName) => {
    const normalized = (statusName || "").toLowerCase();
    switch (normalized) {
      case "pending":
        return "Waiting for initial review";
      case "under_review":
        return "Application is being evaluated";
      case "interview_scheduled":
        return "Interview has been scheduled";
      case "approved":
        return "Application approved - will convert to volunteer";
      case "rejected":
        return "Application has been declined";
      default:
        return "";
    }
  };

  // Load statuses and history on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setHistoryLoading(true);
        setError(null);

        // Load statuses (required)
        const statusesData = await getApplicationStatuses();
        setStatuses(statusesData);
        setLoading(false);

        // Load history (optional - may be empty for new applicants)
        try {
          const historyData = await getApplicantStatusHistory(applicantId);
          setHistory(historyData || []);
        } catch (historyErr) {
          console.warn("Failed to load status history:", historyErr);
          setHistory([]);
        } finally {
          setHistoryLoading(false);
        }
      } catch (err) {
        console.error("Failed to load application statuses:", err);
        setError(err?.message || "Failed to load application statuses");
        setLoading(false);
        setHistoryLoading(false);
      }
    };

    if (applicantId) {
      loadData();
    }
  }, [applicantId]);

  // Update selected status when currentStatus changes
  useEffect(() => {
    setSelectedStatus(currentStatus);
  }, [currentStatus]);

  const handleStatusChange = (newStatus) => {
    // Check if the status change is allowed
    if (!isStatusAllowed(newStatus)) {
      setError(
        `Cannot change to "${newStatus}". Please follow the workflow steps.`
      );
      return;
    }

    // Always reset scheduleData when initiating a non-interview status change
    setScheduleData(null);

    // Interview scheduling requires extra details before confirmation
    if (newStatus === "interview_scheduled") {
      setError(null);
      setPendingStatus(newStatus);
      setSelectedStatus(newStatus);
      // NOTE: scheduleData is set to null above to clear old schedule data
      setShowScheduleModal(true);
      setShowConfirmModal(false);
      return;
    }

    setSelectedStatus(newStatus);
    setPendingStatus(newStatus);
    setShowConfirmModal(true);
    setError(null); // Clear any previous errors
  };

  const handleConfirmStatusChange = async (notes = null) => {
    if (!pendingStatus || !applicantId) return;

    setProcessing(true);
    setError(null);

    try {
      const payload = { notes: notes || null, schedule: null };

      if (pendingStatus === "interview_scheduled") {
        // Defensive check: This prevents API call if the schedule modal was dismissed unexpectedly
        if (!scheduleData) {
          setShowConfirmModal(false);
          setShowScheduleModal(true);
          setError("Please set an interview schedule before confirming.");
          setProcessing(false);
          return;
        }
        payload.schedule = scheduleData;
      }

      await updateApplicantStatus(applicantId, pendingStatus, payload);

      // Reload history
      try {
        const historyData = await getApplicantStatusHistory(applicantId);
        setHistory(historyData || []);
      } catch (historyErr) {
        console.warn("Failed to reload status history:", historyErr);
      }

      // Notify parent component
      if (typeof onStatusChange === "function") {
        onStatusChange(pendingStatus);
      }

      setShowConfirmModal(false);
      setPendingStatus(null);
      setScheduleData(null);
    } catch (err) {
      console.error("Failed to update applicant status:", err);
      setError(err?.message || "Failed to update status. Please try again.");
      setSelectedStatus(currentStatus);
    } finally {
      setProcessing(false);
    }
  };

  const handleCancelStatusChange = () => {
    setShowConfirmModal(false);
    setShowScheduleModal(false);
    setPendingStatus(null);
    setSelectedStatus(currentStatus);
    // Reset schedule data if the change was canceled
    setScheduleData(null); 
    setError(null);
  };

  const handleScheduleSave = (schedule) => {
    setScheduleData(schedule);
    setShowScheduleModal(false);
    // Automatically open the final confirmation modal after saving schedule
    setShowConfirmModal(true);
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
        <div className="animate-pulse space-y-3 sm:space-y-4">
          <div className="h-5 sm:h-6 bg-gray-200 dark:bg-gray-700 rounded w-2/3 sm:w-1/3"></div>
          <div className="space-y-2 sm:space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-12 bg-gray-200 dark:bg-gray-700 rounded"
              ></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const allowedStatuses = getAllowedNextStatuses(currentStatus);
  const isInFinalState = allowedStatuses.length === 0;

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
        <h3 className="text-lg sm:text-xl font-semibold sm:font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <svg
            className="w-6 h-6 text-indigo-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
          Application Workflow Management
        </h3>

        {/* Workflow Progress */}
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-linear-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
          <h4 className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Application Progress
          </h4>
          <div className="flex items-center justify-between overflow-x-auto pb-2">
            {
              // Show a single final step which is either 'approved' or 'rejected'
              (() => {
                const base = ["pending", "under_review", "interview_scheduled"];
                const final = (currentStatus && ["approved", "rejected"].includes(currentStatus.toLowerCase()))
                  ? currentStatus.toLowerCase()
                  : "approved";
                const displayWorkflow = [...base, final];

                return displayWorkflow.map((status, index) => {
                  const isCurrent = currentStatus?.toLowerCase() === status;
                  const currentIndex = displayWorkflow.indexOf(currentStatus?.toLowerCase());
                  const statusIndex = displayWorkflow.indexOf(status);
                  const isCompleted =
                    statusIndex < currentIndex ||
                    (currentStatus?.toLowerCase() === "approved" && status === "approved") ||
                    (currentStatus?.toLowerCase() === "rejected" && status === "rejected");
                  const isRejectedStep = status === "rejected";

                  return (
                    <div key={status} className="flex items-center flex-1 min-w-0">
                      <div className="flex flex-col items-center flex-1">
                        <div
                          // FIX: Removed unnecessary class concatenation split error here
                          className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-semibold text-xs sm:text-sm shrink-0 ${
                            isCurrent
                              ? isRejectedStep
                                ? "bg-red-600 text-white ring-2 sm:ring-4 ring-red-200 dark:ring-red-800"
                                : "bg-indigo-600 text-white ring-2 sm:ring-4 ring-indigo-200 dark:ring-indigo-800"
                              : isCompleted
                              ? "bg-green-500 text-white"
                              : isRejectedStep
                              ? "bg-red-100 text-red-700"
                              : "bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400"
                          }`}
                        >
                          {isCompleted ? "✓" : index + 1}
                        </div>
                        <span
                          className={`mt-1 sm:mt-2 text-[10px] sm:text-xs font-medium text-center leading-tight px-1 ${
                            isCurrent
                              ? isRejectedStep
                                ? "text-red-600 dark:text-red-400"
                                : "text-indigo-600 dark:text-indigo-400"
                              : isCompleted
                              ? "text-green-600 dark:text-green-400"
                              : isRejectedStep
                              ? "text-red-600 dark:text-red-400"
                              : "text-gray-500 dark:text-gray-400"
                          }`}
                        >
                          {status
                            .split("_")
                            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                            .join(" ")}
                        </span>
                      </div>
                      {index < displayWorkflow.length - 1 && (
                        <div
                          className={`h-0.5 sm:h-1 flex-1 mx-1 sm:mx-2 ${
                            isCompleted
                              ? "bg-green-500"
                              : "bg-gray-300 dark:bg-gray-600"
                          }`}
                        ></div>
                      )}
                    </div>
                  );
                });
              })()}
          </div>
        </div>

        {error && (
          <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-xs sm:text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {isInFinalState && (
          <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 text-center">
              This application is in a final state. No further status changes
              are allowed.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Status Selector */}
          <div>
            <StatusSelector
              statuses={statuses}
              currentStatus={currentStatus}
              selectedStatus={selectedStatus}
              onStatusChange={handleStatusChange}
              disabled={processing || isInFinalState}
              allowedStatuses={allowedStatuses}
              getStatusDescription={getStatusDescription}
            />
          </div>

          {/* Status Timeline */}
          <div>
            <StatusTimeline history={history} loading={historyLoading} />
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <StatusChangeConfirmModal
        isOpen={showConfirmModal}
        onClose={handleCancelStatusChange}
        onConfirm={handleConfirmStatusChange}
        newStatus={pendingStatus}
        currentStatus={currentStatus}
        processing={processing}
        schedule={scheduleData}
      />

      <InterviewScheduleModal
        isOpen={showScheduleModal}
        onClose={handleCancelStatusChange}
        onSave={handleScheduleSave}
        initialValue={scheduleData}
        mode="auto"
      />
    </>
  );
}