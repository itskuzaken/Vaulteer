import { getAuth } from "firebase/auth";
import { API_BASE } from "../../config/config";

/**
 * Get the current authenticated user's ID
 */
export const getCurrentUserId = async () => {
  const auth = getAuth();
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error("User not authenticated");
  }

  const token = await currentUser.getIdToken();
  const meResponse = await fetch(`${API_BASE}/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!meResponse.ok) {
    throw new Error("Failed to fetch user data");
  }

  const meData = await meResponse.json();
  return meData.user_id;
};

/**
 * Get comprehensive user profile data
 */
export const fetchComprehensiveProfile = async (userId) => {
  const auth = getAuth();
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error("User not authenticated");
  }

  const token = await currentUser.getIdToken();
  const response = await fetch(`${API_BASE}/profile/${userId}/comprehensive`, {
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
export const updatePersonalProfile = async (userId, profileData) => {
  const auth = getAuth();
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error("User not authenticated");
  }

  const token = await currentUser.getIdToken();
  const response = await fetch(`${API_BASE}/profile/${userId}/personal`, {
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
export const updateWorkProfile = async (userId, workData) => {
  const auth = getAuth();
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error("User not authenticated");
  }

  const token = await currentUser.getIdToken();
  const response = await fetch(`${API_BASE}/profile/${userId}/work-profile`, {
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
export const updateStudentProfile = async (userId, studentData) => {
  const auth = getAuth();
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error("User not authenticated");
  }

  const token = await currentUser.getIdToken();
  const response = await fetch(
    `${API_BASE}/profile/${userId}/student-profile`,
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
export const updateTrainings = async (userId, trainingIds) => {
  const auth = getAuth();
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error("User not authenticated");
  }

  const token = await currentUser.getIdToken();
  const response = await fetch(`${API_BASE}/profile/${userId}/trainings`, {
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
export const updateAvailableDays = async (userId, dayIds) => {
  const auth = getAuth();
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error("User not authenticated");
  }

  const token = await currentUser.getIdToken();
  const response = await fetch(`${API_BASE}/profile/${userId}/available-days`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ dayIds }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to update available days");
  }

  return await response.json();
};

/**
 * Update working days
 */
export const updateWorkingDays = async (userId, dayIds) => {
  const auth = getAuth();
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error("User not authenticated");
  }

  const token = await currentUser.getIdToken();
  const response = await fetch(`${API_BASE}/profile/${userId}/working-days`, {
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
export const updateSchoolDays = async (userId, dayIds) => {
  const auth = getAuth();
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error("User not authenticated");
  }

  const token = await currentUser.getIdToken();
  const response = await fetch(`${API_BASE}/profile/${userId}/school-days`, {
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
