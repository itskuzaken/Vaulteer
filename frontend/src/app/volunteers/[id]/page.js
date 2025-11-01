"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getUserById } from "../../../services/userService";

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-600 border-t-transparent mx-auto"></div>
        <p className="mt-4 text-gray-600 dark:text-gray-300">
          Loading volunteer...
        </p>
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800 rounded-xl p-6 shadow-md text-center space-y-4 max-w-md">
        <h2 className="text-xl font-semibold text-red-600 dark:text-red-400">
          Unable to load volunteer
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-300">{message}</p>
        <button
          onClick={onRetry}
          className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

export default function VolunteerProfilePage({ params }) {
  const router = useRouter();
  const { id } = params;
  const [volunteer, setVolunteer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadVolunteer() {
      setLoading(true);
      setError(null);
      try {
        const data = await getUserById(id);
        if (!cancelled) {
          setVolunteer(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err?.message ||
              "Something went wrong while fetching the volunteer profile."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadVolunteer();

    return () => {
      cancelled = true;
    };
  }, [id, refreshKey]);

  const avatarUrl = useMemo(() => {
    if (!volunteer) return null;

    const source =
      volunteer.photoUrl ||
      volunteer.photoURL ||
      volunteer.photo_url ||
      (volunteer.email
        ? `https://ui-avatars.com/api/?name=${encodeURIComponent(
            volunteer.name || volunteer.email
          )}&background=D32F2F&color=fff&size=128`
        : null);

    return (
      source ||
      "https://ui-avatars.com/api/?name=Volunteer&background=D32F2F&color=fff&size=128"
    );
  }, [volunteer]);

  const handleRetry = () => setRefreshKey((prev) => prev + 1);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <LoadingState />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <ErrorState message={error} onRetry={handleRetry} />
        </div>
      </div>
    );
  }

  if (!volunteer) {
    return null;
  }

  const fullName =
    volunteer.name ||
    `${volunteer.first_name || ""} ${volunteer.last_name || ""}`.trim();
  const status = (volunteer.status || "unknown").toLowerCase();

  const statusConfig = {
    active: {
      label: "Active",
      badge:
        "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800",
      dot: "bg-green-600",
    },
    inactive: {
      label: "Inactive",
      badge:
        "bg-gray-50 dark:bg-gray-800/60 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700",
      dot: "bg-gray-400",
    },
    pending: {
      label: "Pending",
      badge:
        "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
      dot: "bg-amber-500",
    },
  };

  const statusStyles = statusConfig[status] || statusConfig.inactive;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-300 dark:hover:text-red-200"
          >
            <span aria-hidden>←</span>
            Back
          </button>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Volunteer ID: {volunteer.id}
          </span>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-lg overflow-hidden">
          <div className="p-6 md:p-8 flex flex-col md:flex-row gap-6 md:gap-10">
            <div className="flex-shrink-0 relative">
              <img
                src={avatarUrl}
                alt={fullName ? `${fullName}'s profile` : "Volunteer avatar"}
                className="w-32 h-32 md:w-40 md:h-40 rounded-full object-cover ring-4 ring-red-100 dark:ring-red-900/40"
              />
              <span
                className={`absolute bottom-2 right-2 w-4 h-4 rounded-full border-2 border-white dark:border-gray-800 ${statusStyles.dot}`}
              />
            </div>

            <div className="flex-1 space-y-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                  {fullName || "Unnamed Volunteer"}
                </h1>
                {volunteer.email && (
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    {volunteer.email}
                  </p>
                )}
              </div>

              <div
                className={`inline-flex items-center gap-2 border rounded-full px-4 py-1 text-xs font-semibold uppercase tracking-wide ${statusStyles.badge}`}
              >
                <span className={`w-2 h-2 rounded-full ${statusStyles.dot}`} />
                <span>{statusStyles.label}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {volunteer.phone_number && (
                  <InfoRow label="Phone" value={volunteer.phone_number} />
                )}
                {volunteer.role && (
                  <InfoRow label="Role" value={volunteer.role} />
                )}
                {volunteer.address && (
                  <InfoRow label="Address" value={volunteer.address} />
                )}
                {volunteer.created_at && (
                  <InfoRow
                    label="Joined"
                    value={new Date(volunteer.created_at).toLocaleDateString()}
                  />
                )}
              </div>
            </div>
          </div>

          {volunteer.bio && (
            <div className="border-t border-gray-200 dark:border-gray-700 p-6 md:p-8">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                About
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                {volunteer.bio}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
      <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold">
        {label}
      </p>
      <p className="mt-1 text-sm text-gray-900 dark:text-gray-100 break-words">
        {value}
      </p>
    </div>
  );
}
