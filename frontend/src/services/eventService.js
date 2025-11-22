import { fetchWithAuth } from "./apiClient";

// ============================================
// EVENT LISTING
// ============================================

export async function getAllEvents(filters = {}) {
  const params = new URLSearchParams();

  Object.keys(filters).forEach((key) => {
    const value = filters[key];
    if (value === undefined || value === null || value === "") {
      return;
    }
    params.append(key, value);
  });

  const queryString = params.toString();
  return fetchWithAuth(`/events${queryString ? `?${queryString}` : ""}`);
}

export async function getEventDetails(eventUid) {
  return fetchWithAuth(`/events/${eventUid}`);
}

export async function getUpcomingEvents(limit = 10) {
  return fetchWithAuth(`/events/upcoming?limit=${limit}`);
}

// ============================================
// ADMIN/STAFF ACTIONS
// ============================================

export async function createEvent(eventData) {
  return fetchWithAuth("/events", {
    method: "POST",
    body: JSON.stringify(eventData),
  });
}

export async function updateEvent(eventUid, updates) {
  return fetchWithAuth(`/events/${eventUid}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
}

export async function deleteEvent(eventUid) {
  return fetchWithAuth(`/events/${eventUid}`, {
    method: "DELETE",
  });
}

export async function publishEvent(eventUid) {
  return fetchWithAuth(`/events/${eventUid}/publish`, {
    method: "POST",
  });
}

export async function postponeEvent(eventUid, payload) {
  return fetchWithAuth(`/events/${eventUid}/postpone`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function archiveEvent(eventUid) {
  return fetchWithAuth(`/events/${eventUid}/archive`, {
    method: "POST",
  });
}

export async function getEventStats(eventUid) {
  return fetchWithAuth(`/events/${eventUid}/stats`);
}

export async function getCreatorStats() {
  return fetchWithAuth("/events/my/stats");
}

// ============================================
// VOLUNTEER PARTICIPATION
// ============================================

export async function joinEvent(eventUid) {
  return fetchWithAuth(`/events/${eventUid}/join`, {
    method: "POST",
  });
}

export async function leaveEvent(eventUid) {
  return fetchWithAuth(`/events/${eventUid}/leave`, {
    method: "DELETE",
  });
}

export async function getMyEvents(status = null) {
  const params = status ? `?status=${status}` : "";
  return fetchWithAuth(`/events/my/events${params}`);
}

// ============================================
// PARTICIPANT MANAGEMENT
// ============================================

export async function getEventParticipants(eventUid, status = null) {
  const params = status ? `?status=${status}` : "";
  return fetchWithAuth(`/events/${eventUid}/participants${params}`);
}

export async function updateParticipantStatus(eventUid, userId, status) {
  return fetchWithAuth(`/events/${eventUid}/participants/${userId}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function markAttendance(eventUid, attendees) {
  return fetchWithAuth(`/events/${eventUid}/attendance`, {
    method: "POST",
    body: JSON.stringify({ attendees }),
  });
}
