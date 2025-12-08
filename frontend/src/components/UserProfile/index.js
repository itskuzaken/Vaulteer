"use client";

import { useState, useEffect, useCallback } from "react";
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
} from "./ProfileAPI";
import {
  calculateProfileCompletion,
  deepClone,
  validateRequiredFields,
} from "./ProfileUtils";
import { normalizeMobile, isValidMobile } from "@/utils/formValidation";

import ProfileHeader from "./ProfileHeader";
import PersonalDetails from "./PersonalDetails";
import WorkProfile from "./WorkProfile";
import StudentProfile from "./StudentProfile";
import Trainings from "./Trainings";
import AvailableDays from "./AvailableDays";
import ActivitySummary from "./ActivitySummary";
import Achievements from "./Achievements";

export default function UserProfile() {
  const [user, setUser] = useState(null);
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
  const [reactivationNotice, setReactivationNotice] = useState(false);

  // Edited data for each section
  const [editedPersonalProfile, setEditedPersonalProfile] = useState({});
  const [editedWorkProfile, setEditedWorkProfile] = useState({});
  const [editedStudentProfile, setEditedStudentProfile] = useState({});
  const [editedTrainings, setEditedTrainings] = useState([]);
  const [editedAvailableDays, setEditedAvailableDays] = useState([]);
  const [editedWorkingDays, setEditedWorkingDays] = useState([]);
  const [editedSchoolDays, setEditedSchoolDays] = useState([]);

  const populateEditedState = useCallback(
    (sourceData) => {
      const data = sourceData || comprehensiveData;
      if (!data) {
        return;
      }

      setEditedPersonalProfile(deepClone(data.profile || {}));
      setEditedWorkProfile(deepClone(data.workProfile || {}));
      setEditedStudentProfile(deepClone(data.studentProfile || {}));
      setEditedTrainings((data.trainings || []).map((t) => t.training_id));
      setEditedAvailableDays(
        (data.availableDays || []).map((day) => day.day_id)
      );
      setEditedWorkingDays((data.workingDays || []).map((day) => day.day_id));
      setEditedSchoolDays((data.schoolDays || []).map((day) => day.day_id));
    },
    [comprehensiveData]
  );

  const resetEditedState = useCallback(() => {
    setEditedPersonalProfile({});
    setEditedWorkProfile({});
    setEditedStudentProfile({});
    setEditedTrainings([]);
    setEditedAvailableDays([]);
    setEditedWorkingDays([]);
    setEditedSchoolDays([]);
  }, []);

  const loadComprehensiveProfile = useCallback(
    async (id) => {
      const data = await fetchComprehensiveProfile(id);
      setComprehensiveData(data);

      if (data.profile) {
        const completion = calculateProfileCompletion(data.profile);
        setProfileCompletion(completion);
      }

      if (isEditing) {
        populateEditedState(data);
      }
    },
    [isEditing, populateEditedState]
  );

  const loadActivitySummary = useCallback(async (id) => {
    const summary = await fetchActivitySummary(id);
    setActivitySummary(summary);
  }, []);

  const initializeProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const id = await getCurrentUserId();
      setUserId(id);

      await Promise.all([
        loadComprehensiveProfile(id),
        loadActivitySummary(id),
      ]);
    } catch (err) {
      setError(err.message);
      console.error("Error initializing profile:", err);
    } finally {
      setLoading(false);
    }
  }, [loadComprehensiveProfile, loadActivitySummary]);

  useEffect(() => {
    const auth = getAuth();
    const currentUser = auth.currentUser;

    if (!currentUser) {
      setError("User not authenticated");
      setLoading(false);
      return;
    }

    setUser(currentUser);
    initializeProfile();
  }, [initializeProfile]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const flag = window.sessionStorage.getItem(
        "vaulteer:reactivatedFromInactive"
      );
      if (flag === "true") {
        setReactivationNotice(true);
        window.sessionStorage.removeItem("vaulteer:reactivatedFromInactive");
      }
    } catch (storageError) {
      console.warn(
        "Unable to read reactivation flag from session storage",
        storageError
      );
    }
  }, []);

  const handleEditClick = () => {
    populateEditedState(comprehensiveData);
    setIsEditing(true);
    setError(null);
    setSuccess(null);
  };

  const handleCancelEdit = () => {
    resetEditedState();
    setIsEditing(false);
    setError(null);
    setSuccess(null);
  };

  const handleSaveClick = async () => {
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

      // Validate phone number — normalize first and validate standard mobile format
      if (editedPersonalProfile.mobile_number) {
        const normalizedMobile = normalizeMobile(editedPersonalProfile.mobile_number);
        // Use isValidMobile (normalized '09...' format) to validate
        if (!isValidMobile(normalizedMobile)) {
          throw new Error(
            "Invalid phone number format. Use: 09XX-XXX-XXXX or +639XXXXXXXXX"
          );
        }
        // Persist a normalized format for saving (e.g., 09123456789)
        editedPersonalProfile.mobile_number = normalizedMobile;
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

      // Reload profile data
      await loadComprehensiveProfile(userId);

      resetEditedState();
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
            onClick={initializeProfile}
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

      {reactivationNotice && (
        <div className="bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 text-sm text-gray-700 dark:text-gray-200">
          Your account was automatically marked inactive after a period of
          inactivity. We reactivated it when you logged in.
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
      {!isEditing && <ActivitySummary activitySummary={activitySummary} />}

      {/* Achievements */}
      {!isEditing && (
        <Achievements achievements={comprehensiveData?.achievements} />
      )}
    </div>
  );
}
