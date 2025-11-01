import { getIdToken } from "./firebase";
import { API_BASE } from "../config/config";

// Helper for fetch with error handling
async function fetchWithAuth(url, options = {}) {
  const token = await getIdToken();
  if (!token) throw new Error("Not authenticated");
  const res = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
      "Content-Type":
        options.method === "PUT" || options.method === "POST"
          ? "application/json"
          : undefined,
    },
    credentials: "include",
  });
  let data;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    const msg = data?.error || data?.message || "Request failed";
    throw new Error(msg);
  }
  return data;
}

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

  return await fetchWithAuth(`${API_BASE}/users/${endpoint}${filterQuery}`);
}

// Get all users
export async function getAllUsers() {
  return await fetchWithAuth(`${API_BASE}/users`);
}

// Get volunteers
export async function getVolunteers() {
  return await fetchWithAuth(`${API_BASE}/users/volunteers`);
}

// Get staff members
export async function getStaffs() {
  return await fetchWithAuth(`${API_BASE}/users/staffs`);
}

// Get applicants (alternative to applicantsService)
export async function getApplicants() {
  return await fetchWithAuth(`${API_BASE}/users/applicants`);
}

// Get admins
export async function getAdmins() {
  return await fetchWithAuth(`${API_BASE}/users/admins`);
}

// Create a new user
export async function createUser(userData) {
  return await fetchWithAuth(`${API_BASE}/users`, {
    method: "POST",
    body: JSON.stringify(userData),
  });
}

// Update user by ID (now supports status update)
export async function updateUser(userId, updateData) {
  return await fetchWithAuth(`${API_BASE}/users/${userId}`, {
    method: "PUT",
    body: JSON.stringify(updateData),
  });
}

// Delete user by ID
export async function deleteUser(userId) {
  return await fetchWithAuth(`${API_BASE}/users/${userId}`, {
    method: "DELETE",
  });
}

export async function getUserById(userId) {
  return await fetchWithAuth(`${API_BASE}/users/${userId}`);
}

// Get current user info and role
export async function getCurrentUser() {
  return await fetchWithAuth(`${API_BASE}/me`);
}
