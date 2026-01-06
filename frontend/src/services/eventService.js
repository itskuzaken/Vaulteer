import { fetchWithAuth } from "./apiClient";
import { API_BASE } from "../config/config";
import { getIdToken } from "./firebase";

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

export async function cancelEvent(eventUid) {
  return fetchWithAuth(`/events/${eventUid}/cancel`, {
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

// ============================================
// ATTENDANCE APIs (staff/admin)
// ============================================

export async function getAttendance(eventUid) {
  return fetchWithAuth(`/events/${eventUid}/attendance`);
}

export async function checkInParticipant(eventUid, participantId) {
  return fetchWithAuth(`/events/${eventUid}/attendance/checkin`, {
    method: 'POST',
    body: JSON.stringify({ participantId }),
  });
}

export async function patchAttendance(eventUid, participantId, newStatus, reason = null) {
  return fetchWithAuth(`/events/${eventUid}/attendance/${participantId}`, {
    method: 'PATCH',
    body: JSON.stringify({ newStatus, reason }),
  });
}

export async function getAttendanceAudit(eventUid, params = {}) {
  const qs = new URLSearchParams(params).toString();
  return fetchWithAuth(`/events/${eventUid}/attendance/audit${qs ? `?${qs}` : ''}`);
}

export async function autoFlagAbsences(eventUid) {
  return fetchWithAuth(`/events/${eventUid}/attendance/auto-flag`, { method: 'POST' });
}

// ============================================
// REPORTS (ADMIN/STAFF)
// ============================================

export async function listEventReports(eventUid, params = {}) {
  const qs = new URLSearchParams(params).toString();
  return fetchWithAuth(`/events/${eventUid}/reports${qs ? `?${qs}` : ''}`);
}

export async function generateEventReport(eventUid, options = {}) {
  return fetchWithAuth(`/events/${eventUid}/reports/generate`, {
    method: 'POST',
    body: JSON.stringify(options),
  });
}

export async function getEventReportDownloadUrl(eventUid, reportId) {
  return fetchWithAuth(`/events/${eventUid}/reports/${reportId}/download`);
}

// ============================================
// ANALYTICS REPORTS (NEW)
// ============================================

/**
 * Get analytics report for a completed event
 * @param {string} eventUid - Event UID
 * @returns {Promise<Object>} Report data
 */
export async function getEventAnalyticsReport(eventUid) {
  return fetchWithAuth(`/events/${eventUid}/analytics-report`);
}

/**
 * Manually regenerate analytics report (admin/staff only)
 * @param {string} eventUid - Event UID
 * @returns {Promise<Object>} Regenerated report data
 */
export async function regenerateEventAnalyticsReport(eventUid) {
  return fetchWithAuth(`/events/${eventUid}/analytics-report/regenerate`, {
    method: 'POST',
  });
}

/**
 * Download analytics report as PDF (admin/staff only)
 * Uses direct fetch with blob handling for file download
 * @param {string} eventUid - Event UID
 */
export async function downloadEventAnalyticsReportPdf(eventUid) {
  const token = await getIdToken();
  if (!token) {
    throw new Error('Authentication required');
  }
  
  const response = await fetch(`${API_BASE}/events/${eventUid}/analytics-report/pdf`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  if (!response.ok) {
    // Try to get error message from JSON response
    try {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to download PDF');
    } catch {
      throw new Error(`Failed to download PDF (${response.status})`);
    }
  }
  
  // Get blob and trigger download
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `event-report-${eventUid}.pdf`;
  document.body.appendChild(link);
  link.click();
  
  // Cleanup
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
