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

// Fetch all applicants
export async function getAllApplicants() {
  return await fetchWithAuth(`${API_BASE}/applicants`);
}

// Get all application statuses
export async function getApplicationStatuses() {
  return await fetchWithAuth(`${API_BASE}/applicants/statuses`);
}

// Get applicant status history
export async function getApplicantStatusHistory(userId) {
  return await fetchWithAuth(`${API_BASE}/applicants/${userId}/history`);
}

// Update applicant status (new generic function)
export async function updateApplicantStatus(userId, status, notes = null) {
  return await fetchWithAuth(`${API_BASE}/applicants/${userId}/status`, {
    method: "PUT",
    body: JSON.stringify({ status, notes }),
  });
}

// Approve applicant (update role to 'volunteer' and status to 'active')
export async function approveApplicant(userId) {
  return await fetchWithAuth(`${API_BASE}/applicants/${userId}/approve`, {
    method: "PUT",
    body: JSON.stringify({ status: "active" }),
  });
}

// Reject applicant (update status to 'rejected')
export async function rejectApplicant(userId) {
  return await fetchWithAuth(`${API_BASE}/applicants/${userId}/reject`, {
    method: "PUT",
    body: JSON.stringify({ status: "rejected" }),
  });
}

// Get applicant by ID
export async function getApplicantById(userId) {
  return await fetchWithAuth(`${API_BASE}/applicants/${userId}`);
}

// Submit new volunteer application (public - no auth required)
export async function submitVolunteerApplication(userData, formData) {
  const res = await fetch(`${API_BASE}/applicants`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      user: userData,
      form: formData,
    }),
  });

  let data;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const msg = data?.error || data?.message || "Failed to submit application";
    throw new Error(msg);
  }

  return data;
}
