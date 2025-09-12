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
  return await fetchWithAuth(`${API_BASE}/${role}s${filterQuery}`);
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

// Get current user info and role
export async function getCurrentUser() {
  return await fetchWithAuth(`${API_BASE}/me`);
}
