import { getAuth } from "firebase/auth";
import { API_BASE } from "../config/config";

/**
 * Profile Service
 * Handles all profile-related API calls
 */

/**
 * Get user profile by ID
 * @param {number} userId - User ID
 * @returns {Promise<Object>} User profile data
 */
export async function getUserProfile(userId) {
  try {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      throw new Error("User not authenticated");
    }

    const token = await user.getIdToken();

    const response = await fetch(`${API_BASE}/profile/${userId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to fetch profile");
    }

    const result = await response.json();
    return result.data || result;
  } catch (error) {
    console.error("Error fetching user profile:", error);
    throw error;
  }
}

/**
 * Update user profile
 * @param {number} userId - User ID
 * @param {Object} profileData - Profile data to update
 * @returns {Promise<Object>} Updated profile data
 */
export async function updateUserProfile(userId, profileData) {
  try {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      throw new Error("User not authenticated");
    }

    const token = await user.getIdToken();

    const response = await fetch(`${API_BASE}/profile/${userId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(profileData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to update profile");
    }

    const result = await response.json();
    return result.data || result;
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw error;
  }
}

/**
 * Upload profile picture
 * @param {number} userId - User ID
 * @param {File} file - Image file
 * @returns {Promise<Object>} Upload result with image URL
 */
export async function uploadProfilePicture(userId, file) {
  try {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      throw new Error("User not authenticated");
    }

    const token = await user.getIdToken();
    const formData = new FormData();
    formData.append("profile_picture", file);

    const response = await fetch(`${API_BASE}/profile/${userId}/picture`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to upload profile picture");
    }

    const result = await response.json();
    return result.data || result;
  } catch (error) {
    console.error("Error uploading profile picture:", error);
    throw error;
  }
}

/**
 * Change user password
 * @param {Object} passwordData - Current and new password
 * @returns {Promise<Object>} Result
 */
export async function changePassword(passwordData) {
  try {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      throw new Error("User not authenticated");
    }

    const token = await user.getIdToken();

    const response = await fetch(`${API_BASE}/profile/change-password`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(passwordData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to change password");
    }

    const result = await response.json();
    return result.data || result;
  } catch (error) {
    console.error("Error changing password:", error);
    throw error;
  }
}

/**
 * Get user activity summary for profile
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Activity summary
 */
export async function getUserActivitySummary(userId) {
  try {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      throw new Error("User not authenticated");
    }

    const token = await user.getIdToken();

    const response = await fetch(`${API_BASE}/logs/user/${userId}/summary`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to fetch activity summary");
    }

    const result = await response.json();
    return result.data || result;
  } catch (error) {
    console.error("Error fetching activity summary:", error);
    throw error;
  }
}

/**
 * Get comprehensive user profile with all related data
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Comprehensive profile data including work, student, trainings, etc.
 */
export async function getComprehensiveUserProfile(userId) {
  try {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      throw new Error("User not authenticated");
    }

    const token = await user.getIdToken();

    const response = await fetch(
      `${API_BASE}/profile/${userId}/comprehensive`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || "Failed to fetch comprehensive profile"
      );
    }

    const result = await response.json();
    return result.data || result;
  } catch (error) {
    console.error("Error fetching comprehensive profile:", error);
    throw error;
  }
}

/**
 * Update user work profile
 * @param {number} userId - User ID
 * @param {Object} workData - Work profile data {position, industry, company, work_shift, work_other_skills}
 * @returns {Promise<Object>} Response data
 */
export async function updateWorkProfile(userId, workData) {
  try {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      throw new Error("User not authenticated");
    }

    const token = await user.getIdToken();

    const response = await fetch(`${API_BASE}/profile/${userId}/work-profile`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(workData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to update work profile");
    }

    return await response.json();
  } catch (error) {
    console.error("Error updating work profile:", error);
    throw error;
  }
}

/**
 * Update user personal profile (detailed profile in user_profiles table)
 * @param {number} userId - User ID
 * @param {Object} personalData - Personal profile data
 * @returns {Promise<Object>} Response data
 */
export async function updatePersonalProfile(userId, personalData) {
  try {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      throw new Error("User not authenticated");
    }

    const token = await user.getIdToken();

    const response = await fetch(`${API_BASE}/profile/${userId}/personal`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(personalData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to update personal profile");
    }

    return await response.json();
  } catch (error) {
    console.error("Error updating personal profile:", error);
    throw error;
  }
}

/**
 * Update user student profile
 * @param {number} userId - User ID
 * @param {Object} studentData - Student profile data {school, course, graduation, student_other_skills}
 * @returns {Promise<Object>} Response data
 */
export async function updateStudentProfile(userId, studentData) {
  try {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      throw new Error("User not authenticated");
    }

    const token = await user.getIdToken();

    const response = await fetch(
      `${API_BASE}/profile/${userId}/student-profile`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(studentData),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to update student profile");
    }

    return await response.json();
  } catch (error) {
    console.error("Error updating student profile:", error);
    throw error;
  }
}

/**
 * Update user trainings
 * @param {number} userId - User ID
 * @param {Array<number>} trainingIds - Array of training IDs
 * @returns {Promise<Object>} Response data
 */
export async function updateTrainings(userId, trainingIds) {
  try {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      throw new Error("User not authenticated");
    }

    const token = await user.getIdToken();

    const response = await fetch(`${API_BASE}/profile/${userId}/trainings`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ trainingIds }), // Changed to camelCase
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to update trainings");
    }

    return await response.json();
  } catch (error) {
    console.error("Error updating trainings:", error);
    throw error;
  }
}

/**
 * Update user available days
 * @param {number} userId - User ID
 * @param {Array<number>} dayIds - Array of day IDs
 * @returns {Promise<Object>} Response data
 */
export async function updateAvailableDays(userId, dayIds) {
  try {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      throw new Error("User not authenticated");
    }

    const token = await user.getIdToken();

    const response = await fetch(
      `${API_BASE}/profile/${userId}/available-days`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ dayIds }), // Changed to camelCase
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to update available days");
    }

    return await response.json();
  } catch (error) {
    console.error("Error updating available days:", error);
    throw error;
  }
}

/**
 * Update user working days
 * @param {number} userId - User ID
 * @param {Array<number>} dayIds - Array of day IDs
 * @returns {Promise<Object>} Response data
 */
export async function updateWorkingDays(userId, dayIds) {
  try {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      throw new Error("User not authenticated");
    }

    const token = await user.getIdToken();

    const response = await fetch(`${API_BASE}/profile/${userId}/working-days`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ dayIds }), // Changed to camelCase
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to update working days");
    }

    return await response.json();
  } catch (error) {
    console.error("Error updating working days:", error);
    throw error;
  }
}

/**
 * Update user school days
 * @param {number} userId - User ID
 * @param {Array<number>} dayIds - Array of day IDs
 * @returns {Promise<Object>} Response data
 */
export async function updateSchoolDays(userId, dayIds) {
  try {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      throw new Error("User not authenticated");
    }

    const token = await user.getIdToken();

    const response = await fetch(`${API_BASE}/profile/${userId}/school-days`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ dayIds }), // Changed to camelCase
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to update school days");
    }

    return await response.json();
  } catch (error) {
    console.error("Error updating school days:", error);
    throw error;
  }
}
