'use client';

import { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { IoCheckmarkCircle, IoCloseCircle, IoTime, IoCalendar } from 'react-icons/io5';
import {
  getApplicationSettings,
  openApplications,
  closeApplications,
  updateDeadline,
} from '@/services/applicationSettingsService';

export default function ApplicationControlPanel() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showDeadlineModal, setShowDeadlineModal] = useState(false);
  const [deadlineInput, setDeadlineInput] = useState('');
  const [timeRemaining, setTimeRemaining] = useState('');

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
      console.error('Error fetching settings:', err);
      setError('Failed to load application settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Calculate time remaining until deadline
  useEffect(() => {
    if (!settings?.is_open || !settings?.deadline) {
      setTimeRemaining('');
      return;
    }

    const calculateTimeRemaining = () => {
      const now = new Date();
      const deadline = new Date(settings.deadline);
      const diff = deadline - now;

      if (diff <= 0) {
        setTimeRemaining('Deadline passed');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setTimeRemaining(`${days}d ${hours}h remaining`);
      } else if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m remaining`);
      } else {
        setTimeRemaining(`${minutes}m remaining`);
      }
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [settings]);

  // Handle opening applications
  const handleOpen = async () => {
    if (!confirm('Are you sure you want to open volunteer applications?')) {
      return;
    }

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
        throw new Error('Not authenticated');
      }

      const idToken = await user.getIdToken();
      const deadline = deadlineInput || null;

      const result = await openApplications(deadline, idToken);
      if (result.success) {
        setSettings(result.data);
        setShowDeadlineModal(false);
        setDeadlineInput('');
      }
    } catch (err) {
      console.error('Error opening applications:', err);
      setError(err.message || 'Failed to open applications');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle closing applications
  const handleClose = async () => {
    if (!confirm('Are you sure you want to close volunteer applications?')) {
      return;
    }

    try {
      setActionLoading(true);
      setError(null);

      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        throw new Error('Not authenticated');
      }

      const idToken = await user.getIdToken();
      const result = await closeApplications(idToken);
      if (result.success) {
        setSettings(result.data);
      }
    } catch (err) {
      console.error('Error closing applications:', err);
      setError(err.message || 'Failed to close applications');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle updating deadline
  const handleUpdateDeadline = async () => {
    if (!deadlineInput) {
      alert('Please select a deadline');
      return;
    }

    try {
      setActionLoading(true);
      setError(null);

      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        throw new Error('Not authenticated');
      }

      const idToken = await user.getIdToken();
      const result = await updateDeadline(deadlineInput, idToken);
      if (result.success) {
        setSettings(result.data);
        setDeadlineInput('');
      }
    } catch (err) {
      console.error('Error updating deadline:', err);
      setError(err.message || 'Failed to update deadline');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-3">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
          <IoTime className="text-blue-600" />
          Application Status Control
        </h2>
        {settings?.is_open && (
          <div className="flex items-center gap-2 text-green-600 font-medium">
            <IoCheckmarkCircle className="text-xl" />
            Open
          </div>
        )}
        {!settings?.is_open && (
          <div className="flex items-center gap-2 text-red-600 font-medium">
            <IoCloseCircle className="text-xl" />
            Closed
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-600 mb-1">Current Status</p>
          <p className="text-lg font-semibold text-gray-800">
            {settings?.is_open ? 'Applications Open' : 'Applications Closed'}
          </p>
        </div>

        {settings?.deadline && settings?.is_open && (
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1 flex items-center gap-1">
              <IoCalendar /> Deadline
            </p>
            <p className="text-lg font-semibold text-gray-800">
              {new Date(settings.deadline).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
            {timeRemaining && (
              <p className="text-sm text-blue-600 mt-1">{timeRemaining}</p>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-3">
        {settings?.is_open ? (
          <>
            <button
              onClick={handleClose}
              disabled={actionLoading}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
            >
              {actionLoading ? 'Closing...' : 'Close Applications'}
            </button>
            <button
              onClick={() => setShowDeadlineModal(true)}
              disabled={actionLoading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
            >
              Update Deadline
            </button>
          </>
        ) : (
          <button
            onClick={handleOpen}
            disabled={actionLoading}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
          >
            {actionLoading ? 'Opening...' : 'Open Applications'}
          </button>
        )}
      </div>

      {/* Deadline Modal */}
      {showDeadlineModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold mb-4">
              {settings?.is_open ? 'Update Deadline' : 'Set Application Deadline'}
            </h3>
            <p className="text-gray-600 mb-4">
              {settings?.is_open
                ? 'Choose a new deadline for volunteer applications (optional).'
                : 'Choose a deadline for volunteer applications (optional). Leave empty for no deadline.'}
            </p>
            <input
              type="datetime-local"
              value={deadlineInput}
              onChange={(e) => setDeadlineInput(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeadlineModal(false);
                  setDeadlineInput('');
                }}
                disabled={actionLoading}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 disabled:opacity-50 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={settings?.is_open ? handleUpdateDeadline : handleConfirmOpen}
                disabled={actionLoading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium transition-colors"
              >
                {actionLoading
                  ? 'Processing...'
                  : settings?.is_open
                  ? 'Update'
                  : 'Open Applications'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
