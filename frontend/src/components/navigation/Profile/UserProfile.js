"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { getAuth } from "firebase/auth";
import {
  getCurrentUserId,
  fetchComprehensiveProfile,
  fetchActivitySummary,
  updatePersonalProfile,
  updateWorkProfile as updateWorkProfileAPI,
  updateStudentProfile as updateStudentProfileAPI,
  updateTrainings as updateTrainingsAPI,
  updateAvailableDays as updateAvailableDaysAPI,
  updateWorkingDays as updateWorkingDaysAPI,
  updateSchoolDays as updateSchoolDaysAPI,
} from "../../UserProfile/ProfileAPI";
import {
  calculateProfileCompletion,
  deepClone,
  validateRequiredFields,
  isValidPhone,
} from "../../UserProfile/ProfileUtils";
import { logActions } from "../../../services/activityLogService";
import { updateUser as updateUserAPI } from "../../../services/userService";
import { useDashboardUser } from "../../../hooks/useDashboardUser";

import ProfileHeader from "../../UserProfile/ProfileHeader";
import PersonalDetails from "../../UserProfile/PersonalDetails";
import WorkProfile from "../../UserProfile/WorkProfile";
import StudentProfile from "../../UserProfile/StudentProfile";
import Trainings from "../../UserProfile/Trainings";
import AvailableDays from "../../UserProfile/AvailableDays";
import ActivitySummary from "../../UserProfile/ActivitySummary";
import Achievements from "../../UserProfile/Achievements";

const dedupeByKey = (items, key) => {
  if (!Array.isArray(items)) {
    return [];
  }

  return Array.from(
    new Map(
      items.map((item, index) => {
        const dedupeKey =
          item && Object.prototype.hasOwnProperty.call(item, key)
            ? item[key]
            : `__${index}`;
        return [dedupeKey, item];
      })
    ).values()
  );
};

const normalizeComprehensiveData = (data) => {
  if (!data) {
    return null;
  }

  const normalized = { ...data };
  normalized.trainings = dedupeByKey(normalized.trainings, "training_id");
  normalized.availableDays = dedupeByKey(normalized.availableDays, "day_id");
  normalized.workingDays = dedupeByKey(normalized.workingDays, "day_id");
  normalized.schoolDays = dedupeByKey(normalized.schoolDays, "day_id");
  return normalized;
};

export default function UserProfile() {
  const searchParams = useSearchParams();

  const [user, setUser] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [userId, setUserId] = useState(null);
  const [comprehensiveData, setComprehensiveData] = useState(null);
  const [activitySummary, setActivitySummary] = useState(null);
  const [profileCompletion, setProfileCompletion] = useState(0);

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [statusUpdating, setStatusUpdating] = useState(false);

  // Edited data for each section
  const [editedPersonalProfile, setEditedPersonalProfile] = useState({});
  const [editedWorkProfile, setEditedWorkProfile] = useState({});
  const [editedStudentProfile, setEditedStudentProfile] = useState({});
  const [editedTrainings, setEditedTrainings] = useState([]);
  const [editedAvailableDays, setEditedAvailableDays] = useState([]);
  const [editedWorkingDays, setEditedWorkingDays] = useState([]);
  const [editedSchoolDays, setEditedSchoolDays] = useState([]);

  // Original data for cancel functionality
  const [originalData, setOriginalData] = useState(null);

  const latestRequestRef = useRef(0);
  const lastLoadedUserIdRef = useRef(null);

  const resetEditingState = useCallback(() => {
    setIsEditing(false);
    setSaving(false);
    setEditedPersonalProfile({});
    setEditedWorkProfile({});
    setEditedStudentProfile({});
    setEditedTrainings([]);
    setEditedAvailableDays([]);
    setEditedWorkingDays([]);
    setEditedSchoolDays([]);
  }, []);

  const requestedUserIdParam = searchParams.get("userId");
  const normalizedRequestedUserId = requestedUserIdParam?.trim() || null;

  const { user: dashboardUser } = useDashboardUser();

  useEffect(() => {
    if (dashboardUser?.user_id) {
      setCurrentUserId(String(dashboardUser.user_id));
    }
    if (dashboardUser?.email && !user) {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      if (currentUser) {
        setUser(currentUser);
      }
    }
  }, [dashboardUser, user]);

  useEffect(() => {
    const auth = getAuth();
    const currentUser = auth.currentUser;

    if (!currentUser) {
      setError("User not authenticated");
      setLoading(false);
      return;
    }

    setUser(currentUser);

    let isActive = true;

    const resolveCurrentUserId = async () => {
      try {
        const id = await getCurrentUserId();
        if (isActive) {
          setCurrentUserId(String(id));
        }
      } catch (err) {
        console.error("Error resolving current user ID:", err);
        if (isActive) {
          setCurrentUserId(null);
          if (!normalizedRequestedUserId) {
            setError(err?.message || "Unable to determine current user");
            setLoading(false);
          }
        }
      }
    };

    resolveCurrentUserId();

    return () => {
      isActive = false;
      latestRequestRef.current = 0;
    };
  }, [normalizedRequestedUserId]);

  const reloadProfileData = useCallback(
    async (id, options = {}) => {
      if (!user) {
        return false;
      }

      const normalizedId = String(id || "").trim();
      if (!normalizedId) {
        return false;
      }

      const { showLoader = true, clearExisting = showLoader } = options;
      const requestId = Date.now();
      latestRequestRef.current = requestId;
      lastLoadedUserIdRef.current = normalizedId;

      if (showLoader) {
        setLoading(true);
      }

      setError(null);
      setSuccess(null);
      resetEditingState();
      setUserId(normalizedId);

      if (clearExisting) {
        setComprehensiveData(null);
        setActivitySummary(null);
        setOriginalData(null);
        setProfileCompletion(0);
      }

      try {
        const [profileResponse, summaryResponse] = await Promise.all([
          fetchComprehensiveProfile(normalizedId),
          fetchActivitySummary(normalizedId),
        ]);

        if (latestRequestRef.current !== requestId) {
          return false;
        }

        const normalizedProfile = normalizeComprehensiveData(profileResponse);

        setComprehensiveData(normalizedProfile);
        setOriginalData(deepClone(normalizedProfile));
        setActivitySummary(summaryResponse);

        if (normalizedProfile?.profile) {
          const completion = calculateProfileCompletion(
            normalizedProfile.profile
          );
          setProfileCompletion(completion);
        } else {
          setProfileCompletion(0);
        }

        return true;
      } catch (err) {
        if (latestRequestRef.current !== requestId) {
          return false;
        }

        console.error("Error loading profile:", err);
        lastLoadedUserIdRef.current = null;
        setError(err?.message || "Failed to load profile");
        return false;
      } finally {
        if (showLoader && latestRequestRef.current === requestId) {
          setLoading(false);
        }
      }
    },
    [resetEditingState, user]
  );

  const targetUserId = normalizedRequestedUserId || currentUserId;

  useEffect(() => {
    if (!user) {
      return;
    }

    if (!targetUserId) {
      return;
    }

    if (String(targetUserId) === lastLoadedUserIdRef.current) {
      return;
    }

    reloadProfileData(targetUserId, { showLoader: true });
  }, [user, targetUserId, reloadProfileData]);

  const currentUserRole = dashboardUser?.role || null;

  const canEditProfile = useMemo(() => {
    if (!userId) {
      return false;
    }
    if (currentUserRole === "admin") {
      return true;
    }
    if (!currentUserId) {
      return false;
    }
    return String(currentUserId) === String(userId);
  }, [currentUserId, currentUserRole, userId]);

  const canManageStatus = useMemo(
    () => currentUserRole === "admin",
    [currentUserRole]
  );

  const handleEditClick = () => {
    if (!canEditProfile || !comprehensiveData) {
      return;
    }

    // Initialize edit data with current values
    setEditedPersonalProfile(deepClone(comprehensiveData.profile || {}));
    setEditedWorkProfile(deepClone(comprehensiveData.workProfile || {}));
    setEditedStudentProfile(deepClone(comprehensiveData.studentProfile || {}));

    // Deduplicate arrays before setting them
    setEditedTrainings([
      ...new Set((comprehensiveData.trainings || []).map((t) => t.training_id)),
    ]);
    setEditedAvailableDays([
      ...new Set((comprehensiveData.availableDays || []).map((d) => d.day_id)),
    ]);
    setEditedWorkingDays([
      ...new Set((comprehensiveData.workingDays || []).map((d) => d.day_id)),
    ]);
    setEditedSchoolDays([
      ...new Set((comprehensiveData.schoolDays || []).map((d) => d.day_id)),
    ]);

    setIsEditing(true);
    setError(null);
    setSuccess(null);
  };

  const handleCancelEdit = () => {
    // Restore original data
    setComprehensiveData(deepClone(originalData));

    // Reset edited data
    resetEditingState();
    setError(null);
    setSuccess(null);
  };

  const handleSaveClick = async () => {
    if (!canEditProfile) {
      setError("You do not have permission to edit this profile.");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      // Validate personal profile
      const requiredFields = [
        "first_name",
        "last_name",
        "birthdate",
        "gender",
        "mobile_number",
        "city",
      ];
      const validation = validateRequiredFields(
        editedPersonalProfile,
        requiredFields
      );

      if (!validation.isValid) {
        throw new Error(
          `Please fill in required fields: ${validation.missingFields.join(
            ", "
          )}`
        );
      }

      // Validate phone number
      if (
        editedPersonalProfile.mobile_number &&
        !isValidPhone(editedPersonalProfile.mobile_number)
      ) {
        throw new Error(
          "Invalid phone number format. Use: 09XX-XXX-XXXX or +639XXXXXXXXX"
        );
      }

      // Save all sections in parallel
      await Promise.all(
        [
          updatePersonalProfile(userId, editedPersonalProfile),
          comprehensiveData.workProfile &&
            updateWorkProfileAPI(userId, editedWorkProfile),
          comprehensiveData.studentProfile &&
            updateStudentProfileAPI(userId, editedStudentProfile),
          updateTrainingsAPI(userId, editedTrainings),
          updateAvailableDaysAPI(userId, editedAvailableDays),
          comprehensiveData.workProfile &&
            updateWorkingDaysAPI(userId, editedWorkingDays),
          comprehensiveData.studentProfile &&
            updateSchoolDaysAPI(userId, editedSchoolDays),
        ].filter(Boolean)
      );

      // Log the profile update activity
      try {
        const changes = {
          personal: {
            name: `${editedPersonalProfile.first_name} ${editedPersonalProfile.last_name}`,
            mobile: editedPersonalProfile.mobile_number,
            city: editedPersonalProfile.city,
          },
          trainings_count: editedTrainings.length,
          available_days_count: editedAvailableDays.length,
        };

        if (comprehensiveData.workProfile) {
          changes.work = {
            position: editedWorkProfile.position,
            company: editedWorkProfile.company,
          };
        }

        if (comprehensiveData.studentProfile) {
          changes.student = {
            school: editedStudentProfile.school,
            course: editedStudentProfile.course,
          };
        }

        await logActions.updateProfile(changes);
      } catch (logError) {
        // Don't fail the save if logging fails
        console.warn("Failed to log profile update:", logError);
      }

      // Reload profile data
      await reloadProfileData(userId, {
        showLoader: false,
        clearExisting: false,
      });

      setIsEditing(false);
      setSuccess("Profile updated successfully!");

      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError(err.message);
      console.error("Error saving profile:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (nextStatus) => {
    if (!canManageStatus || !isEditing || !userId) {
      return;
    }

    const targetStatus = (nextStatus || "").trim().toLowerCase();
    if (!targetStatus || !["active", "inactive"].includes(targetStatus)) {
      return;
    }

    if (comprehensiveData?.user?.status === targetStatus) {
      return;
    }

    try {
      setStatusUpdating(true);
      setError(null);
      await updateUserAPI(userId, { status: targetStatus });
      await reloadProfileData(userId, {
        showLoader: false,
        clearExisting: false,
      });
      setSuccess("Status updated successfully!");
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      console.error("Failed to update status:", err);
      setError(err?.message || "Failed to update status");
    } finally {
      setStatusUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            Loading profile...
          </p>
        </div>
      </div>
    );
  }

  if (error && !comprehensiveData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <svg
            className="w-16 h-16 text-red-600 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Error Loading Profile
          </p>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => {
              const fallbackId =
                normalizedRequestedUserId || userId || currentUserId;
              if (fallbackId) {
                reloadProfileData(fallbackId, { showLoader: true });
              } else {
                setError("Unable to retry without a user identifier.");
              }
            }}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-4">
      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-center gap-3">
          <svg
            className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-green-800 dark:text-green-200 font-medium">
            {success}
          </p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center gap-3">
          <svg
            className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-red-800 dark:text-red-200 font-medium">{error}</p>
        </div>
      )}

      {/* Profile Header */}
      <ProfileHeader
        user={user}
        comprehensiveData={comprehensiveData}
        profileCompletion={profileCompletion}
        isEditing={isEditing}
        onEditClick={handleEditClick}
        onSaveClick={handleSaveClick}
        onCancelClick={handleCancelEdit}
        saving={saving}
        canEdit={canEditProfile}
        canManageStatus={canManageStatus}
        onStatusChange={handleStatusChange}
        statusUpdating={statusUpdating}
      />

      {/* Personal Details */}
      <PersonalDetails
        profile={comprehensiveData?.profile}
        isEditing={isEditing}
        editedData={editedPersonalProfile}
        onChange={setEditedPersonalProfile}
      />

      {/* Work Profile */}
      {comprehensiveData?.workProfile && (
        <WorkProfile
          workProfile={comprehensiveData.workProfile}
          workingDays={comprehensiveData.workingDays}
          isEditing={isEditing}
          editedData={editedWorkProfile}
          editedDays={editedWorkingDays}
          onChange={setEditedWorkProfile}
          onDaysChange={setEditedWorkingDays}
        />
      )}

      {/* Student Profile */}
      {comprehensiveData?.studentProfile && (
        <StudentProfile
          studentProfile={comprehensiveData.studentProfile}
          schoolDays={comprehensiveData.schoolDays}
          isEditing={isEditing}
          editedData={editedStudentProfile}
          editedDays={editedSchoolDays}
          onChange={setEditedStudentProfile}
          onDaysChange={setEditedSchoolDays}
        />
      )}

      {/* Trainings & Available Days Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trainings */}
        <Trainings
          trainings={comprehensiveData?.trainings}
          isEditing={isEditing}
          editedTrainings={editedTrainings}
          onChange={setEditedTrainings}
        />

        {/* Available Days */}
        <AvailableDays
          availableDays={comprehensiveData?.availableDays}
          isEditing={isEditing}
          editedDays={editedAvailableDays}
          onChange={setEditedAvailableDays}
        />
      </div>

      {/* Activity Summary */}
      <ActivitySummary activitySummary={activitySummary} />

      {/* Achievements */}
      <Achievements achievements={comprehensiveData?.achievements} />
    </div>
  );
}
