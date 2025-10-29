"use client";

import { useState, useEffect } from "react";
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

import ProfileHeader from "../../UserProfile/ProfileHeader";
import PersonalDetails from "../../UserProfile/PersonalDetails";
import WorkProfile from "../../UserProfile/WorkProfile";
import StudentProfile from "../../UserProfile/StudentProfile";
import Trainings from "../../UserProfile/Trainings";
import AvailableDays from "../../UserProfile/AvailableDays";
import ActivitySummary from "../../UserProfile/ActivitySummary";
import Achievements from "../../UserProfile/Achievements";

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
  }, []);

  const initializeProfile = async () => {
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
  };

  const loadComprehensiveProfile = async (id) => {
    const data = await fetchComprehensiveProfile(id);

    // Deduplicate arrays to prevent duplicate entries
    if (data.trainings) {
      data.trainings = Array.from(
        new Map(data.trainings.map((item) => [item.training_id, item])).values()
      );
    }
    if (data.availableDays) {
      data.availableDays = Array.from(
        new Map(data.availableDays.map((item) => [item.day_id, item])).values()
      );
    }
    if (data.workingDays) {
      data.workingDays = Array.from(
        new Map(data.workingDays.map((item) => [item.day_id, item])).values()
      );
    }
    if (data.schoolDays) {
      data.schoolDays = Array.from(
        new Map(data.schoolDays.map((item) => [item.day_id, item])).values()
      );
    }

    setComprehensiveData(data);

    // Calculate profile completion
    if (data.profile) {
      const completion = calculateProfileCompletion(data.profile);
      setProfileCompletion(completion);
    }

    // Store original data for cancel functionality
    setOriginalData(deepClone(data));
  };

  const loadActivitySummary = async (id) => {
    const summary = await fetchActivitySummary(id);
    setActivitySummary(summary);
  };

  const handleEditClick = () => {
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
    setEditedPersonalProfile({});
    setEditedWorkProfile({});
    setEditedStudentProfile({});
    setEditedTrainings([]);
    setEditedAvailableDays([]);
    setEditedWorkingDays([]);
    setEditedSchoolDays([]);

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
      await loadComprehensiveProfile(userId);

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
      <ActivitySummary activitySummary={activitySummary} />

      {/* Achievements */}
      <Achievements achievements={comprehensiveData?.achievements} />
    </div>
  );
}
