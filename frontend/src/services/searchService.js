import { getIdToken } from "./firebase";
import { buildUserFilterQuery } from "./filterService";
import { API_BASE } from "../config/config"; // centralized base

async function fetchWithAuth(url, options = {}) {
  const token = await getIdToken();
  if (!token) throw new Error("Not authenticated");
  const res = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    credentials: "include",
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* ignore non-JSON */
  }
  if (!res.ok) {
    const msg = data?.error || data?.message || "Request failed";
    throw new Error(msg);
  }
  return data;
}

export async function searchUsersByRoleAndName(role, name, filters = {}) {
  const roleParam = encodeURIComponent(role);
  const trimmed = (name || "").trim();
  const namePart = trimmed ? `&name=${encodeURIComponent(trimmed)}` : "";
  const filterQuery = buildUserFilterQuery(filters); // expected to return leading & pairs or empty string
  const url = `${API_BASE}/users/search?role=${roleParam}${namePart}${filterQuery}`;
  return fetchWithAuth(url);
}

export async function searchVolunteersByName(name) {
  return searchUsersByRoleAndName("volunteer", name);
}
export async function searchStaffByName(name) {
  return searchUsersByRoleAndName("staff", name);
}
