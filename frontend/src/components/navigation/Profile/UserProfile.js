"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { getAuth } from "firebase/auth";
import {
  getCurrentUserIdentifiers,
  fetchComprehensiveProfile,
  fetchActivitySummary,
  updatePersonalProfile,
  updateWorkProfile as updateWorkProfileAPI,
  updateStudentProfile as updateStudentProfileAPI,
  updateTrainings as updateTrainingsAPI,
  updateAvailableDays as updateAvailableDaysAPI,
  updateWorkingDays as updateWorkingDaysAPI,
  updateSchoolDays as updateSchoolDaysAPI,
  updateVolunteerInfo as updateVolunteerInfoAPI,
  updateVolunteerRoles as updateVolunteerRolesAPI,
} from "../../UserProfile/ProfileAPI";
import {
  calculateProfileCompletion,
  deepClone,
  validateRequiredFields,
  isValidPhone,
} from "../../UserProfile/ProfileUtils";
import { logActions } from "../../../services/activityLogService";
import {
  updateUserStatus as updateUserStatusAPI,
  updateUserRole as updateUserRoleAPI,
} from "../../../services/userService";
import { useDashboardUser } from "../../../hooks/useDashboardUser";

import ProfileHeader from "../../UserProfile/ProfileHeader";
import PersonalDetails from "../../UserProfile/PersonalDetails";
import WorkProfile from "../../UserProfile/WorkProfile";
import StudentProfile from "../../UserProfile/StudentProfile";
import Trainings from "../../UserProfile/Trainings";
import AvailableDays from "../../UserProfile/AvailableDays";
import ActivitySummary from "../../UserProfile/ActivitySummary";
import Achievements from "../../UserProfile/Achievements";
import AdminControls from "../../UserProfile/AdminControls";
import ApplicantAdminControls from "../../UserProfile/ApplicantAdminControls";
import VolunteerProfile from "../../UserProfile/VolunteerProfile";
import ValidIdSection from "./ValidIdSection";
import { getCertificates, getCertificateDownloadUrl } from "../../../services/profileService";

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
  const [currentUserUid, setCurrentUserUid] = useState(null);
  const [profileUserId, setProfileUserId] = useState(null);
  const [profileUserUid, setProfileUserUid] = useState(null);
  const [comprehensiveData, setComprehensiveData] = useState(null);
  const [activitySummary, setActivitySummary] = useState(null);
  const [profileCompletion, setProfileCompletion] = useState(0);
  const [certificates, setCertificates] = useState([]);
  const [certLoading, setCertLoading] = useState(false);

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
  const [editedVolunteerInfo, setEditedVolunteerInfo] = useState({});
  const [editedVolunteerRoles, setEditedVolunteerRoles] = useState([]);
  const [roleUpdating, setRoleUpdating] = useState(false);
  const [adminRoleDraft, setAdminRoleDraft] = useState("");
  const [showStatusConfirm, setShowStatusConfirm] = useState(false);
  const [pendingStatus, setPendingStatus] = useState(null);

  // Original data for cancel functionality
  const [originalData, setOriginalData] = useState(null);

  const latestRequestRef = useRef(0);
  const lastLoadedUserUidRef = useRef(null);

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
    setAdminRoleDraft("");
    setStatusUpdating(false);
    setRoleUpdating(false);
    setPendingStatus(null);
    setShowStatusConfirm(false);
  }, []);

  const requestedUserUidParam = searchParams.get("userUid");
  const normalizedRequestedUserUid = requestedUserUidParam?.trim() || null;

  const { user: dashboardUser } = useDashboardUser();

  useEffect(() => {
    if (dashboardUser?.user_id) {
      setCurrentUserId(String(dashboardUser.user_id));
    }
    if (dashboardUser?.uid) {
      setCurrentUserUid(dashboardUser.uid);
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
        const identifiers = await getCurrentUserIdentifiers();
        if (isActive && identifiers) {
          if (identifiers.userId) {
            setCurrentUserId(String(identifiers.userId));
          }
          if (identifiers.userUid) {
            setCurrentUserUid(identifiers.userUid);
          }
        }
      } catch (err) {
        console.error("Error resolving current user ID:", err);
        if (isActive) {
          setCurrentUserId(null);
          setCurrentUserUid(null);
          if (!normalizedRequestedUserUid) {
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
  }, [normalizedRequestedUserUid]);

  const reloadProfileData = useCallback(
    async (uid, options = {}) => {
      if (!user) {
        return false;
      }

      const normalizedUid = String(uid || "").trim();
      if (!normalizedUid) {
        return false;
      }

      const { showLoader = true, clearExisting = showLoader } = options;
      const requestId = Date.now();
      latestRequestRef.current = requestId;
      lastLoadedUserUidRef.current = normalizedUid;

      if (showLoader) {
        setLoading(true);
      }

      setError(null);
      setSuccess(null);
      resetEditingState();
      setProfileUserUid(normalizedUid);

      if (clearExisting) {
        setComprehensiveData(null);
        setActivitySummary(null);
        setOriginalData(null);
        setProfileCompletion(0);
      }

      try {
        const profileResponse = await fetchComprehensiveProfile(normalizedUid);

        if (latestRequestRef.current !== requestId) {
          return false;
        }

        const normalizedProfile = normalizeComprehensiveData(profileResponse);
        const nextProfileUserId = normalizedProfile?.user?.user_id
          ? String(normalizedProfile.user.user_id)
          : null;

        let summaryResponse = null;
        if (nextProfileUserId) {
          summaryResponse = await fetchActivitySummary(nextProfileUserId);
        }

        if (latestRequestRef.current !== requestId) {
          return false;
        }

        setComprehensiveData(normalizedProfile);
        setOriginalData(deepClone(normalizedProfile));
        setActivitySummary(summaryResponse || null);
        setAdminRoleDraft((normalizedProfile?.user?.role || "").toLowerCase());
        setProfileUserId(nextProfileUserId);

        if (normalizedProfile?.profile) {
          const completion = calculateProfileCompletion(
            normalizedProfile.profile
          );
          setProfileCompletion(completion);
        } else {
          setProfileCompletion(0);
        }

        // Fetch certificates metadata and prefetch image previews
        (async () => {
          try {
            setCertLoading(true);
            const fetchedCerts = await getCertificates(normalizedUid);
            const previewPromises = (fetchedCerts || []).map(async (c) => {
              if (c && c.mimetype && c.mimetype.startsWith("image/")) {
                try {
                  const url = await getCertificateDownloadUrl(normalizedUid, c.id);
                  return { ...c, previewUrl: url };
                } catch (err) {
                  // If preview presign fails, still include metadata without previewUrl
                  return { ...c };
                }
              }
              return { ...c };
            });
            const withPreviews = await Promise.all(previewPromises);
            setCertificates(withPreviews || []);
          } catch (certErr) {
            console.warn("Failed to load certificates for profile preview:", certErr);
            setCertificates([]);
          } finally {
            setCertLoading(false);
          }
        })();

        return true;
      } catch (err) {
        if (latestRequestRef.current !== requestId) {
          return false;
        }

        console.error("Error loading profile:", err);
        lastLoadedUserUidRef.current = null;
        setProfileUserUid(null);
        setProfileUserId(null);
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

  const targetUserUid = normalizedRequestedUserUid || currentUserUid;

  useEffect(() => {
    if (!user) {
      return;
    }

    if (!targetUserUid) {
      return;
    }

    if (String(targetUserUid) === lastLoadedUserUidRef.current) {
      return;
    }

    reloadProfileData(targetUserUid, { showLoader: true });
  }, [user, targetUserUid, reloadProfileData]);
  const currentUserRole = dashboardUser?.role || null;
  const targetUserRole = (comprehensiveData?.user?.role || "").toLowerCase();
  const targetUserStatus = (
    comprehensiveData?.user?.status || ""
  ).toLowerCase();

  const canEditProfile = useMemo(() => {
    if (!profileUserId) {
      return false;
    }
    // If the profile belongs to an 'applicant', disallow editing for everyone
    if (targetUserRole === "applicant") {
      return false;
    }
    if (currentUserRole === "admin") {
      return true;
    }
    if (targetUserStatus === "deactivated") {
      return false;
    }
    if (!currentUserId) {
      return false;
    }
    return String(currentUserId) === String(profileUserId);
  }, [currentUserId, currentUserRole, profileUserId, targetUserStatus, targetUserRole]);

  useEffect(() => {
    if (!canEditProfile && isEditing) {
      resetEditingState();
    }
  }, [canEditProfile, isEditing, resetEditingState]);

  const isViewingDeactivatedProfile = targetUserStatus === "deactivated";
  const isViewingSelf =
    Boolean(currentUserId) &&
    Boolean(profileUserId) &&
    String(currentUserId) === String(profileUserId);
  const disableSelfDeactivation =
    isViewingSelf && targetUserStatus !== "deactivated";

  const canManageStatus = useMemo(
    () => ["admin", "staff"].includes(currentUserRole),
    [currentUserRole]
  );

  const availableRoles = useMemo(
    () => ["admin", "staff", "volunteer", "applicant"],
    []
  );

  const handleEditClick = () => {
    if (!canEditProfile || !comprehensiveData) {
      return;
    }

    // Initialize edit data with current values
    setEditedPersonalProfile(deepClone(comprehensiveData.profile || {}));
    setEditedWorkProfile(deepClone(comprehensiveData.workProfile || {}));
    setEditedStudentProfile(deepClone(comprehensiveData.studentProfile || {}));
    setEditedVolunteerInfo(deepClone(comprehensiveData.volunteerInfo || {}));

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
    setEditedVolunteerRoles(
      (comprehensiveData.volunteerRoles || []).map((r) => r.role_name)
    );

    setAdminRoleDraft((comprehensiveData?.user?.role || "").toLowerCase());
    setPendingStatus(null);
    setShowStatusConfirm(false);
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
    setPendingStatus(null);
    setShowStatusConfirm(false);
    setAdminRoleDraft((originalData?.user?.role || "").toLowerCase());
  };

  const handleSaveClick = async () => {
    if (!canEditProfile) {
      setError("You do not have permission to edit this profile.");
      return;
    }

    if (!profileUserUid) {
      setError("Missing profile identifier. Please reload and try again.");
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
          updatePersonalProfile(profileUserUid, editedPersonalProfile),
          comprehensiveData.workProfile &&
            updateWorkProfileAPI(profileUserUid, editedWorkProfile),
          comprehensiveData.studentProfile &&
            updateStudentProfileAPI(profileUserUid, editedStudentProfile),
          updateTrainingsAPI(profileUserUid, editedTrainings),
          updateAvailableDaysAPI(profileUserUid, editedAvailableDays),
          comprehensiveData.workProfile &&
            updateWorkingDaysAPI(profileUserUid, editedWorkingDays),
          comprehensiveData.studentProfile &&
            updateSchoolDaysAPI(profileUserUid, editedSchoolDays),
          comprehensiveData.user?.role === "applicant" &&
            Object.keys(editedVolunteerInfo).length > 0 &&
            updateVolunteerInfoAPI(profileUserUid, editedVolunteerInfo),
          comprehensiveData.user?.role === "applicant" &&
            updateVolunteerRolesAPI(profileUserUid, editedVolunteerRoles),
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
      await reloadProfileData(profileUserUid, {
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

  const applyStatusUpdate = useCallback(
    async (targetStatus, previousStatus) => {
      if (!profileUserId) {
        return;
      }

      try {
        setStatusUpdating(true);
        setError(null);
        const response = await updateUserStatusAPI(profileUserId, targetStatus);

        setComprehensiveData((prev) => {
          if (!prev || !prev.user) {
            return prev;
          }
          return {
            ...prev,
            user: {
              ...prev.user,
              status: targetStatus,
            },
          };
        });

        setOriginalData((prev) => {
          if (!prev || !prev.user) {
            return prev;
          }
          return {
            ...prev,
            user: {
              ...prev.user,
              status: targetStatus,
            },
          };
        });

        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("vaulteer:user-status-updated", {
              detail: {
                userId: profileUserId,
                status: targetStatus,
                previousStatus,
              },
            })
          );
        }

        const fallbackMessage =
          targetStatus === "deactivated"
            ? "User has been deactivated."
            : targetStatus === "inactive"
            ? "User has been marked inactive."
            : "User has been activated.";
        setSuccess(response?.message || fallbackMessage);
        setTimeout(() => setSuccess(null), 5000);
      } catch (err) {
        console.error("Failed to update status:", err);
        setError(err?.message || "Failed to update status");
      } finally {
        setStatusUpdating(false);
        setPendingStatus(null);
        setShowStatusConfirm(false);
      }
    },
    [profileUserId, setComprehensiveData, setOriginalData]
  );

  const handleToggleStatus = (explicitStatus) => {
    if (!canManageStatus || !isEditing || !profileUserId || statusUpdating) {
      return;
    }

    const previousStatus = (comprehensiveData?.user?.status || "")
      .toLowerCase()
      .trim();

    const normalizedPrevious =
      previousStatus === "deactivated"
        ? "deactivated"
        : previousStatus === "inactive"
        ? "inactive"
        : "active";

    if (disableSelfDeactivation && normalizedPrevious !== "deactivated") {
      return;
    }

    const nextStatus =
      (explicitStatus || "").toLowerCase().trim() ||
      (normalizedPrevious === "deactivated" ? "active" : "deactivated");

    if (nextStatus === "active" && normalizedPrevious === "inactive") {
      applyStatusUpdate("active", previousStatus || "inactive");
      return;
    }

    if (nextStatus === "deactivated") {
      setPendingStatus({
        value: nextStatus,
        previous: previousStatus || "active",
      });
      setShowStatusConfirm(true);
      return;
    }

    applyStatusUpdate(nextStatus, previousStatus || "active");
  };

  const confirmStatusChange = () => {
    if (!pendingStatus?.value) {
      setShowStatusConfirm(false);
      return;
    }

    applyStatusUpdate(pendingStatus.value, pendingStatus.previous);
  };

  const cancelStatusChange = () => {
    setPendingStatus(null);
    setShowStatusConfirm(false);
  };

  const handleRoleSave = async () => {
    if (!canManageStatus || !isEditing || !profileUserId || roleUpdating) {
      return;
    }

    const normalizedDraft = (adminRoleDraft || "").toLowerCase().trim();
    if (!normalizedDraft) {
      return;
    }

    const currentRole = (comprehensiveData?.user?.role || "").toLowerCase();
    if (normalizedDraft === currentRole) {
      return;
    }

    if (!availableRoles.includes(normalizedDraft)) {
      setError("Selected role is not allowed.");
      return;
    }

    try {
      setRoleUpdating(true);
      setError(null);
      await updateUserRoleAPI(profileUserId, normalizedDraft);

      setAdminRoleDraft(normalizedDraft);

      setComprehensiveData((prev) => {
        if (!prev || !prev.user) {
          return prev;
        }
        return {
          ...prev,
          user: {
            ...prev.user,
            role: normalizedDraft,
          },
        };
      });

      setOriginalData((prev) => {
        if (!prev || !prev.user) {
          return prev;
        }
        return {
          ...prev,
          user: {
            ...prev.user,
            role: normalizedDraft,
          },
        };
      });

      const friendlyRole =
        normalizedDraft.charAt(0).toUpperCase() + normalizedDraft.slice(1);
      setSuccess(`Role updated to ${friendlyRole}.`);
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      console.error("Failed to update role:", err);
      setError(err?.message || "Failed to update role");
    } finally {
      setRoleUpdating(false);
    }
  };

  // Handle applicant status change (approve/reject)
  const handleApplicantStatusChange = useCallback(
    async (newStatus) => {
      try {
        setSuccess(`Application ${newStatus} successfully!`);
        // Reload the profile to get updated data
        if (profileUserUid) {
          await reloadProfileData(profileUserUid, { showLoader: false });
        }
      } catch (err) {
        console.error("Error after status change:", err);
        setError("Status updated but failed to refresh profile data.");
      }
    },
    [profileUserUid, reloadProfileData]
  );

  const pendingStatusIsDeactivation = pendingStatus?.value === "deactivated";
  const pendingStatusTitle = pendingStatusIsDeactivation
    ? "Confirm Deactivation"
    : "Confirm Activation";
  const pendingStatusActionLabel = pendingStatusIsDeactivation
    ? "Deactivate"
    : "Activate";
  const pendingStatusDescription = pendingStatusIsDeactivation
    ? "This action will deactivate the user and prevent them from accessing the dashboard until reactivated. Are you sure you want to continue?"
    : "This action will activate the user and restore their dashboard access immediately. Are you sure you want to continue?";

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
              const fallbackUid =
                normalizedRequestedUserUid || profileUserUid || currentUserUid;
              if (fallbackUid) {
                reloadProfileData(fallbackUid, { showLoader: true });
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
    <div className="max-w-6xl mx-auto space-y-4">
      {showStatusConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-200 flex items-center justify-center">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3l-6.93-12a2 2 0 00-3.46 0l-6.93 12c-.77 1.33.19 3 1.73 3z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {pendingStatusTitle}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  {pendingStatusDescription}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={cancelStatusChange}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                disabled={statusUpdating}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmStatusChange}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={statusUpdating}
              >
                {statusUpdating ? "Processing..." : pendingStatusActionLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-3">
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
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3">
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

      {isViewingDeactivatedProfile && (
        <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200">
          {currentUserRole === "admin"
            ? "This user is currently deactivated. They will regain access once reactivated, and edits you make will reflect after activation."
            : "This profile is currently deactivated. Editing is disabled until an administrator reactivates your account."}
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
      />

      {canManageStatus &&
        !isViewingSelf &&
        isEditing &&
        comprehensiveData?.user && (
          <AdminControls
            currentStatus={comprehensiveData.user.status}
            onToggleStatus={handleToggleStatus}
            statusUpdating={statusUpdating}
            disableStatusToggle={disableSelfDeactivation}
            currentRole={comprehensiveData.user.role}
            roleDraft={adminRoleDraft}
            onRoleDraftChange={setAdminRoleDraft}
            onRoleSave={handleRoleSave}
            roleUpdating={roleUpdating}
            roleOptions={availableRoles}
          />
        )}

      {/* Applicant Admin Controls */}
      {canManageStatus && comprehensiveData?.user?.role === "applicant" && (
        <ApplicantAdminControls
          applicantId={profileUserUid}
          currentStatus={comprehensiveData.user.application_status}
          currentUserRole={currentUserRole}
          onStatusChange={handleApplicantStatusChange}
        />
      )}

      {/* Personal Details */}
      <PersonalDetails
        profile={comprehensiveData?.profile}
        isEditing={isEditing}
        editedData={editedPersonalProfile}
        onChange={setEditedPersonalProfile}
      />

      {/* Volunteer Application Details - Only for Applicants */}
      {comprehensiveData?.user?.role === "applicant" && (
        <VolunteerProfile
          volunteerInfo={comprehensiveData?.volunteerInfo}
          volunteerRoles={comprehensiveData?.volunteerRoles}
          availableDays={comprehensiveData?.availableDays}
          isEditing={isEditing}
          editedVolunteerInfo={editedVolunteerInfo}
          editedRoles={editedVolunteerRoles}
          editedDays={editedAvailableDays}
          onVolunteerInfoChange={setEditedVolunteerInfo}
          onRolesChange={setEditedVolunteerRoles}
          onDaysChange={setEditedAvailableDays}
        />
      )}

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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Trainings */}
        <Trainings
          userUid={profileUserUid}
          trainings={comprehensiveData?.trainings}
          certificates={certificates}
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
      {comprehensiveData?.user?.role !== "applicant" && (
        <ActivitySummary activitySummary={activitySummary} />
      )}

      {/* Achievements */}
      <Achievements achievements={comprehensiveData?.achievements} />

      {/* Valid ID Section - visible to admin/staff or profile owner */}
      {(canManageStatus || isViewingSelf) && (
        <ValidIdSection
          userUid={targetUserUid}
          canEdit={canManageStatus || isViewingSelf}
          canDelete={currentUserRole === "admin" || isViewingSelf}
        />
      )}
    </div>
  );
}
