import { getAuth } from "firebase/auth";
import { API_BASE } from "../../config/config";
import { getCurrentUser } from "../../services/userService";

/**
 * Get the current authenticated user's identifiers (numeric ID + UID)
 */
export const getCurrentUserIdentifiers = async () => {
  const auth = getAuth();
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error("User not authenticated");
  }

  const meData = await getCurrentUser();
  return {
    userId: meData.user_id,
    userUid: meData.uid,
    role: meData.role,
  };
};

/**
 * Get comprehensive user profile data (UID-based)
 */
export const fetchComprehensiveProfile = async (userUid) => {
  const auth = getAuth();
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error("User not authenticated");
  }

  const token = await currentUser.getIdToken();
  const response = await fetch(`${API_BASE}/profile/${userUid}/comprehensive`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch comprehensive profile");
  }

  const result = await response.json();
  // Backend returns { success: true, data: {...} }, extract the data
  return result.data || result;
};

/**
 * Get user activity summary
 */
export const fetchActivitySummary = async (userId) => {
  const auth = getAuth();
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error("User not authenticated");
  }

  const token = await currentUser.getIdToken();
  const response = await fetch(`${API_BASE}/logs/user/${userId}/summary`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch activity summary");
  }

  const data = await response.json();
  return data.data || data; // Handle both {success: true, data: {...}} and direct object
};

/**
 * Update personal profile details (user_profiles table)
 */
export const updatePersonalProfile = async (userUid, profileData) => {
  const auth = getAuth();
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error("User not authenticated");
  }

  const token = await currentUser.getIdToken();
  const response = await fetch(`${API_BASE}/profile/${userUid}/personal`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(profileData),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to update personal profile");
  }

  return await response.json();
};

/**
 * Update work profile
 */
export const updateWorkProfile = async (userUid, workData) => {
  const auth = getAuth();
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error("User not authenticated");
  }

  const token = await currentUser.getIdToken();
  const response = await fetch(`${API_BASE}/profile/${userUid}/work-profile`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(workData),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to update work profile");
  }

  return await response.json();
};

/**
 * Update student profile
 */
export const updateStudentProfile = async (userUid, studentData) => {
  const auth = getAuth();
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error("User not authenticated");
  }

  const token = await currentUser.getIdToken();
  const response = await fetch(
    `${API_BASE}/profile/${userUid}/student-profile`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(studentData),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to update student profile");
  }

  return await response.json();
};

/**
 * Update trainings
 */
export const updateTrainings = async (userUid, trainingIds) => {
  const auth = getAuth();
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error("User not authenticated");
  }

  const token = await currentUser.getIdToken();
  const response = await fetch(`${API_BASE}/profile/${userUid}/trainings`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ trainingIds }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to update trainings");
  }

  return await response.json();
};

/**
 * Update available days
 */
export const updateAvailableDays = async (userUid, dayIds) => {
  const auth = getAuth();
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error("User not authenticated");
  }

  const token = await currentUser.getIdToken();
  const response = await fetch(
    `${API_BASE}/profile/${userUid}/available-days`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ dayIds }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to update available days");
  }

  return await response.json();
};

/**
 * Update working days
 */
export const updateWorkingDays = async (userUid, dayIds) => {
  const auth = getAuth();
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error("User not authenticated");
  }

  const token = await currentUser.getIdToken();
  const response = await fetch(`${API_BASE}/profile/${userUid}/working-days`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ dayIds }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to update working days");
  }

  return await response.json();
};

/**
 * Update school days
 */
export const updateSchoolDays = async (userUid, dayIds) => {
  const auth = getAuth();
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error("User not authenticated");
  }

  const token = await currentUser.getIdToken();
  const response = await fetch(`${API_BASE}/profile/${userUid}/school-days`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ dayIds }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to update school days");
  }

  return await response.json();
};

/**
 * Update volunteer info (reason and frequency)
 */
export const updateVolunteerInfo = async (userUid, volunteerData) => {
  const auth = getAuth();
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error("User not authenticated");
  }

  const token = await currentUser.getIdToken();
  const response = await fetch(`${API_BASE}/profile/${userUid}/volunteer-info`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(volunteerData),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to update volunteer info");
  }

  return await response.json();
};

/**
 * Update volunteer roles
 */
export const updateVolunteerRoles = async (userUid, roleNames) => {
  const auth = getAuth();
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error("User not authenticated");
  }

  const token = await currentUser.getIdToken();
  const response = await fetch(`${API_BASE}/profile/${userUid}/volunteer-roles`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ roleNames }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to update volunteer roles");
  }

  return await response.json();
};
