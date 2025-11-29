import { getAuth } from "firebase/auth";
import { API_BASE } from "../config/config";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || API_BASE;

/**
 * Get authenticated user's token
 */
async function getAuthToken() {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("User not authenticated");
  return await user.getIdToken();
}

/**
 * Create a new activity log entry
 */
export async function createActivityLog({
  type,
  action,
  targetResource = null,
  changes = null,
  description = "",
  severity = "INFO",
  metadata = null,
  occurredAt = null,
}) {
  try {
    const token = await getAuthToken();
    const response = await fetch(`${API_BASE_URL}/logs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        type,
        action,
        targetResource,
        changes,
        description,
        severity,
        metadata,
        occurredAt,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to create activity log");
    }

    const payload = await response.json();

    if (!payload.success) {
      throw new Error(payload.error || "Failed to fetch activity logs");
    }

    return payload;
  } catch (error) {
    // Include the base URL in the log for debugging network failures
    console.error("Error creating activity log:", {
      url: `${API_BASE_URL}/logs`,
      message: error?.message || String(error),
      stack: error?.stack,
    });
    throw error;
  }
}

/**
 * Fetch activity logs with filtering
 */
export async function fetchActivityLogs(
  {
    type = null,
    severity = null,
    action = null,
    actorRole = null,
    status = null,
    startDate = null,
    endDate = null,
    limit = 100,
    offset = 0,
    searchTerm = null,
  } = {},
  { signal } = {}
) {
  try {
    const token = await getAuthToken();

    const params = new URLSearchParams();
    if (type && type !== "ALL") params.append("type", type);
    if (severity && severity !== "ALL") params.append("severity", severity);
    if (action && action !== "ALL") params.append("action", action);
    if (actorRole && actorRole !== "ALL") params.append("actorRole", actorRole);
    if (status && status !== "ALL") params.append("status", status);
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    if (limit) params.append("limit", limit.toString());
    if (offset) params.append("offset", offset.toString());
    if (searchTerm) params.append("searchTerm", searchTerm);

    const response = await fetch(`${API_BASE_URL}/logs?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      signal,
    });

    if (!response.ok) {
      throw new Error("Failed to fetch activity logs");
    }

    return await response.json();
  } catch (error) {
    if (error?.name !== "AbortError") {
      console.error("Error fetching activity logs:", error);
    }
    throw error;
  }
}

/**
 * Fetch activity log statistics
 */
export async function fetchActivityLogStats(days = 7) {
  try {
    const token = await getAuthToken();

    const response = await fetch(`${API_BASE_URL}/logs/stats?days=${days}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch log statistics");
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching log statistics:", error);
    throw error;
  }
}

/**
 * Fetch user activity summary
 */
export async function fetchUserActivitySummary(userId) {
  try {
    const token = await getAuthToken();

    const response = await fetch(
      `${API_BASE_URL}/logs/user/${userId}/summary`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch user activity summary");
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching user activity summary:", error);
    throw error;
  }
}

/**
 * Export activity logs as CSV
 */
export async function exportActivityLogs({
  type = null,
  severity = null,
  action = null,
  actorRole = null,
  status = null,
  startDate = null,
  endDate = null,
  searchTerm = null,
} = {}) {
  try {
    const token = await getAuthToken();

    const params = new URLSearchParams();
    if (type && type !== "ALL") params.append("type", type);
    if (severity && severity !== "ALL") params.append("severity", severity);
    if (action && action !== "ALL") params.append("action", action);
    if (actorRole && actorRole !== "ALL") params.append("actorRole", actorRole);
    if (status && status !== "ALL") params.append("status", status);
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    if (searchTerm) params.append("searchTerm", searchTerm);

    const response = await fetch(
      `${API_BASE_URL}/logs/export?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to export logs");
    }

    // Download the CSV file
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `activity-logs-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    return { success: true };
  } catch (error) {
    console.error("Error exporting logs:", error);
    throw error;
  }
}

/**
 * Helper function to log common actions
 */
export const logActions = {
  // Authentication
  loginSuccess: (userInfo, { occurredAt } = {}) => {
    let eventDate = occurredAt ? new Date(occurredAt) : new Date();
    if (Number.isNaN(eventDate.getTime())) {
      eventDate = new Date();
    }

    return createActivityLog({
      type: "AUTH",
      action: "LOGIN",
      description: `User logged in successfully`,
      metadata: {
        role: userInfo.role,
        email: userInfo.email,
        loginMethod: "Google OAuth",
        timestamp: eventDate.toISOString(),
        localTime: eventDate.toLocaleString(),
      },
      severity: "INFO",
    });
  },

  loginFailure: async (reason, email = null) => {
    const auth = getAuth();
    const currentUser = auth.currentUser;

    if (!currentUser) {
      console.warn(
        "Skipping failed login activity log because there is no authenticated user"
      );
      return;
    }

    try {
      await createActivityLog({
        type: "AUTH",
        action: "LOGIN_FAILED",
        description: `Login attempt failed: ${reason}`,
        metadata: {
          reason,
          email,
          loginMethod: "Google OAuth",
          timestamp: new Date().toISOString(),
          localTime: new Date().toLocaleString(),
        },
        severity: "MEDIUM",
      });
    } catch (error) {
      console.warn("Could not log failed login attempt:", error);
    }
  },

  logout: () =>
    createActivityLog({
      type: "AUTH",
      action: "LOGOUT",
      description: "User logged out",
      metadata: {
        timestamp: new Date().toISOString(),
        localTime: new Date().toLocaleString(),
      },
      severity: "INFO",
    }),

  // Profile
  updateProfile: (changes) =>
    createActivityLog({
      type: "PROFILE",
      action: "UPDATE",
      description: "Updated profile information",
      changes,
      severity: "INFO",
      metadata: {
        timestamp: new Date().toISOString(),
        localTime: new Date().toLocaleString(),
      },
    }),

  adminUpdateUserStatus: ({ userId, userName, previousStatus, nextStatus }) =>
    createActivityLog({
      type: "PROFILE",
      action: "STATUS_UPDATE",
      description: `Updated user status to ${nextStatus}`,
      targetResource: {
        type: "user",
        id: userId,
        name: userName,
      },
      changes: {
        field: "status",
        previous: previousStatus,
        next: nextStatus,
      },
      severity: nextStatus === "deactivated" ? "MEDIUM" : "INFO",
      metadata: {
        timestamp: new Date().toISOString(),
        localTime: new Date().toLocaleString(),
      },
    }),

  adminUpdateUserRole: ({ userId, userName, previousRole, nextRole }) =>
    createActivityLog({
      type: "SECURITY",
      action: "ROLE_UPDATE",
      description: `Updated user role to ${nextRole}`,
      targetResource: {
        type: "user",
        id: userId,
        name: userName,
      },
      changes: {
        field: "role",
        previous: previousRole,
        next: nextRole,
      },
      severity: "MEDIUM",
      metadata: {
        timestamp: new Date().toISOString(),
        localTime: new Date().toLocaleString(),
      },
    }),

  // Events
  registerForEvent: (eventId, eventName) =>
    createActivityLog({
      type: "EVENT",
      action: "REGISTER",
      description: `Registered for event: ${eventName}`,
      targetResource: { type: "event", id: eventId, name: eventName },
      severity: "INFO",

      metadata: {
        timestamp: new Date().toISOString(),
        localTime: new Date().toLocaleString(),
      },
    }),

  createEvent: (eventId, eventName) =>
    createActivityLog({
      type: "EVENT",
      action: "CREATE",
      description: `Created event: ${eventName}`,
      targetResource: { type: "event", id: eventId, name: eventName },
      severity: "INFO",

      metadata: {
        timestamp: new Date().toISOString(),
        localTime: new Date().toLocaleString(),
      },
    }),

  // Volunteers
  approveVolunteer: (volunteerId, volunteerName) =>
    createActivityLog({
      type: "VOLUNTEER_MANAGEMENT",
      action: "APPROVE",
      description: `Approved volunteer: ${volunteerName}`,
      targetResource: {
        type: "volunteer",
        id: volunteerId,
        name: volunteerName,
      },
      severity: "INFO",

      metadata: {
        timestamp: new Date().toISOString(),
        localTime: new Date().toLocaleString(),
      },
    }),

  rejectVolunteer: (volunteerId, volunteerName) =>
    createActivityLog({
      type: "VOLUNTEER_MANAGEMENT",
      action: "REJECT",
      description: `Rejected volunteer application: ${volunteerName}`,
      targetResource: {
        type: "volunteer",
        id: volunteerId,
        name: volunteerName,
      },
      severity: "INFO",

      metadata: {
        timestamp: new Date().toISOString(),
        localTime: new Date().toLocaleString(),
      },
    }),

  // Documents
  uploadDocument: (fileName, fileType) =>
    createActivityLog({
      type: "DOCUMENT",
      action: "UPLOAD",
      description: `Uploaded document: ${fileName}`,
      metadata: { fileName, fileType },
      severity: "INFO",

      metadata: {
        timestamp: new Date().toISOString(),
        localTime: new Date().toLocaleString(),
      },
    }),
};
