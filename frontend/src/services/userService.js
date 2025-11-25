import { fetchWithAuth } from "./apiClient";

// Note: we use the centralized fetchWithAuth from apiClient.js which handles
// authentication token resolution, retries, deduplication and optional cacheTTL.

// Fetch all users by role with optional filter query
export async function getUsersByRole(role, filterQuery = "") {
  // Map role to the new backend endpoints
  const endpoint =
    role === "volunteer"
      ? "volunteers"
      : role === "staff"
      ? "staffs"
      : role === "applicant"
      ? "applicants"
      : role === "admin"
      ? "admins"
      : `roles/${role}`;

  return await fetchWithAuth(`/users/${endpoint}${filterQuery}`);
}

// Get all users
export async function getAllUsers() {
  return await fetchWithAuth(`/users`);
}

// Get volunteers
export async function getVolunteers() {
  return await fetchWithAuth(`/users/volunteers`);
}

// Get staff members
export async function getStaffs() {
  return await fetchWithAuth(`/users/staffs`);
}

// Get applicants (alternative to applicantsService)
export async function getApplicants() {
  return await fetchWithAuth(`/users/applicants`);
}

// Get admins
export async function getAdmins() {
  return await fetchWithAuth(`/users/admins`);
}

// Create a new user
export async function createUser(userData) {
  return await fetchWithAuth(`/users`, {
    method: "POST",
    body: JSON.stringify(userData),
  });
}

// Update user by ID (now supports status update)
export async function updateUser(userId, updateData) {
  return await fetchWithAuth(`/users/${userId}`, {
    method: "PUT",
    body: JSON.stringify(updateData),
  });
}

export async function updateUserStatus(userId, status) {
  return await fetchWithAuth(`/users/${userId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function updateUserRole(userId, role) {
  return await fetchWithAuth(`/users/${userId}/role`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
}

export async function updateUserActivity(userId, payload = {}) {
  return await fetchWithAuth(`/users/${userId}/activity`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

// Delete user by ID
export async function deleteUser(userId) {
  return await fetchWithAuth(`/users/${userId}`, {
    method: "DELETE",
  });
}

export async function getUserById(userId) {
  return await fetchWithAuth(`/users/${userId}`);
}

// Get current user info and role
export async function getCurrentUser() {
  // Cache this call for 5 minutes - used heavily during dashboard load/route protection
  return await fetchWithAuth(`/me`, { method: "GET", cacheTTL: 300_000 });
}
