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
