"use client";

import { useState, useEffect } from "react";
import { getAuth } from "firebase/auth";
import {
  IoCheckmarkCircle,
  IoCloseCircle,
  IoTime,
  IoCalendar,
  IoSettings,
} from "react-icons/io5";
import ModalShell from "@/components/modals/ModalShell";
import {
  getApplicationSettings,
  openApplications,
  closeApplications,
  updateDeadline,
} from "@/services";

export default function ApplicationControlPanel() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showDeadlineModal, setShowDeadlineModal] = useState(false);
  const [showOpenConfirmModal, setShowOpenConfirmModal] = useState(false);
  const [showCloseConfirmModal, setShowCloseConfirmModal] = useState(false);
  const [deadlineInput, setDeadlineInput] = useState("");
  const [timeRemaining, setTimeRemaining] = useState("");

  // Fetch current settings
  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getApplicationSettings();
      if (result.success) {
        setSettings(result.data);
      }
    } catch (err) {
      console.error("Error fetching settings:", err);
      setError("Failed to load application settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Calculate time remaining until deadline
  // Whether we show the deadline card
  const showDeadlineCard = !!(settings?.deadline && settings?.is_open);
  useEffect(() => {
    if (!settings?.is_open || !settings?.deadline) {
      setTimeRemaining("");
      return;
    }

    const calculateTimeRemaining = () => {
      const now = new Date();
      const deadline = new Date(settings.deadline);
      const diff = deadline - now;

      if (diff <= 0) {
        setTimeRemaining("Deadline passed");
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setTimeRemaining(`${days}d ${hours}h remaining`);
      } else if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m remaining`);
      } else {
        // Avoid showing "0m remaining" — display a clearer message
        if (minutes <= 0) {
          setTimeRemaining("Less than a minute");
        } else {
          setTimeRemaining(`${minutes}m remaining`);
        }
      }
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [settings]);

  // Handle opening applications - show confirmation modal
  const handleOpen = () => {
    setShowOpenConfirmModal(true);
  };

  // Handle confirming open from confirmation modal
  const handleConfirmOpenAction = () => {
    setShowOpenConfirmModal(false);
    setShowDeadlineModal(true);
  };

  // Handle confirming open with deadline
  const handleConfirmOpen = async () => {
    try {
      setActionLoading(true);
      setError(null);

      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        throw new Error("Not authenticated");
      }

      const idToken = await user.getIdToken();
      const deadline = deadlineInput || null;

      const result = await openApplications(deadline, idToken);
      if (result.success) {
        setSettings(result.data);
        setShowDeadlineModal(false);
        setDeadlineInput("");
      }
    } catch (err) {
      console.error("Error opening applications:", err);
      setError(err.message || "Failed to open applications");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle closing applications - show confirmation modal
  const handleClose = () => {
    setShowCloseConfirmModal(true);
  };

  // Handle confirming close from confirmation modal
  const handleConfirmClose = async () => {
    try {
      setActionLoading(true);
      setError(null);

      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        throw new Error("Not authenticated");
      }

      const idToken = await user.getIdToken();
      const result = await closeApplications(idToken);
      if (result.success) {
        setSettings(result.data);
        setShowCloseConfirmModal(false);
      }
    } catch (err) {
      console.error("Error closing applications:", err);
      setError(err.message || "Failed to close applications");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle updating deadline
  const handleUpdateDeadline = async () => {
    if (!deadlineInput) {
      setError("Please select a deadline date and time");
      return;
    }

    try {
      setActionLoading(true);
      setError(null);

      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        throw new Error("Not authenticated");
      }

      const idToken = await user.getIdToken();
      const result = await updateDeadline(deadlineInput, idToken);
      if (result.success) {
        setSettings(result.data);
        setShowDeadlineModal(false);
        setDeadlineInput("");
      }
    } catch (err) {
      console.error("Error updating deadline:", err);
      setError(err.message || "Failed to update deadline");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <button disabled className="btn btn-primary flex items-center gap-2">
        <IoSettings className="animate-spin" />
        Loading...
      </button>
    );
  }

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setShowModal(true)}
        className="btn btn-primary flex items-center gap-2"
      >
        <IoSettings />
        Application Settings
      </button>

      {/* Main Settings Modal */}
      <ModalShell
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setError(null);
        }}
        title="Application Status Control"
        description="Manage volunteer application availability and deadlines"
        size="lg"
      >
        <div className="space-y-4">
          {/* Error Alert */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Status Overview */}
          <div
            className={`grid grid-cols-1 ${
              showDeadlineCard ? "md:grid-cols-2" : "md:grid-cols-1"
            } gap-4`}
          >
            {/* Current Status Card */}
            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Current Status
                </p>
                {settings?.is_open ? (
                  <div className="flex items-center gap-1.5 text-green-600 dark:text-green-500">
                    <IoCheckmarkCircle className="text-lg" />
                    <span className="text-sm font-semibold">Open</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-red-600 dark:text-red-500">
                    <IoCloseCircle className="text-lg" />
                    <span className="text-sm font-semibold">Closed</span>
                  </div>
                )}
              </div>
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {settings?.is_open
                  ? "Applications Open"
                  : "Applications Closed"}
              </p>
            </div>

            {/* Deadline Card */}
            {showDeadlineCard && (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-1.5 mb-2">
                  <IoCalendar className="text-blue-600 dark:text-blue-400" />
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    Deadline
                  </p>
                </div>
                <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {new Date(settings.deadline).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                {timeRemaining && (
                  <p className="text-sm text-blue-600 dark:text-blue-400 mt-1 flex items-center gap-1">
                    <IoTime className="text-base" />
                    {timeRemaining}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-2">
            {settings?.is_open ? (
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleClose}
                  disabled={actionLoading}
                  className="btn btn-danger flex items-center justify-center gap-2 flex-1"
                >
                  <IoCloseCircle />
                  {actionLoading ? "Closing..." : "Close Applications"}
                </button>
                <button
                  onClick={() => setShowDeadlineModal(true)}
                  disabled={actionLoading}
                  className="btn btn-outline flex items-center justify-center gap-2 flex-1"
                >
                  <IoCalendar />
                  Update Deadline
                </button>
              </div>
            ) : (
              <button
                onClick={handleOpen}
                disabled={actionLoading}
                className="btn btn-primary flex items-center justify-center gap-2 w-full"
              >
                <IoCheckmarkCircle />
                {actionLoading ? "Opening..." : "Open Applications"}
              </button>
            )}
          </div>
        </div>
      </ModalShell>

      {/* Deadline Modal */}
      <ModalShell
        isOpen={showDeadlineModal}
        onClose={() => {
          setShowDeadlineModal(false);
          setDeadlineInput("");
          setError(null);
        }}
        title={
          settings?.is_open ? "Update Deadline" : "Set Application Deadline"
        }
        description={
          settings?.is_open
            ? "Choose a new deadline for volunteer applications."
            : "Choose a deadline for volunteer applications. Leave empty for no deadline."
        }
      >
        <div className="space-y-4">
          <div>
            <label
              htmlFor="deadline-input"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
            >
              Deadline Date & Time
            </label>
            <input
              id="deadline-input"
              type="datetime-local"
              value={deadlineInput}
              onChange={(e) => setDeadlineInput(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Optional: Applications will automatically close when this deadline
              is reached.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => {
                setShowDeadlineModal(false);
                setDeadlineInput("");
                setError(null);
              }}
              disabled={actionLoading}
              className="btn btn-ghost flex-1"
            >
              Cancel
            </button>
            <button
              onClick={
                settings?.is_open ? handleUpdateDeadline : handleConfirmOpen
              }
              disabled={actionLoading}
              className="btn btn-primary flex-1"
            >
              {actionLoading
                ? "Processing..."
                : settings?.is_open
                ? "Update Deadline"
                : "Open Applications"}
            </button>
          </div>
        </div>
      </ModalShell>

      {/* Open Confirmation Modal */}
      <ModalShell
        isOpen={showOpenConfirmModal}
        onClose={() => setShowOpenConfirmModal(false)}
        title="Open Volunteer Applications"
        description="This will allow volunteers to submit new applications."
        footer={
          <>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setShowOpenConfirmModal(false)}
              disabled={actionLoading}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleConfirmOpenAction}
              disabled={actionLoading}
            >
              Continue
            </button>
          </>
        }
      >
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          Are you sure you want to <strong>open volunteer applications</strong>?
          You will be able to set an optional deadline in the next step.
        </p>
      </ModalShell>

      {/* Close Confirmation Modal */}
      <ModalShell
        isOpen={showCloseConfirmModal}
        onClose={() => setShowCloseConfirmModal(false)}
        title="Close Volunteer Applications"
        description="This will prevent volunteers from submitting new applications."
        footer={
          <>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setShowCloseConfirmModal(false)}
              disabled={actionLoading}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={handleConfirmClose}
              disabled={actionLoading}
            >
              {actionLoading ? "Closing..." : "Yes, close applications"}
            </button>
          </>
        }
      >
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          Are you sure you want to <strong>close volunteer applications</strong>
          ? No new applications will be accepted until you open them again.
        </p>
      </ModalShell>
    </>
  );
}
