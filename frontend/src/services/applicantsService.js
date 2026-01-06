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
export async function updateApplicantStatus(
  userId,
  status,
  { notes = null, schedule = null } = {}
) {
  return await fetchWithAuth(`${API_BASE}/applicants/${userId}/status`, {
    method: "PUT",
    body: JSON.stringify({ status, notes, schedule }),
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
export async function rejectApplicant(userId, { notes = null } = {}) {
  return await fetchWithAuth(`${API_BASE}/applicants/${userId}/reject`, {
    method: "PUT",
    body: JSON.stringify({ notes }),
  });
}

// Get applicant by ID
export async function getApplicantById(userId) {
  return await fetchWithAuth(`${API_BASE}/applicants/${userId}`);
}

// Submit new volunteer application (public - no auth required)
export async function submitVolunteerApplication(userData, formData) {
  // Check if any trainingCertificates have an attached File
  const hasTrainingFiles = Array.isArray(formData.trainingCertificates) && formData.trainingCertificates.some(c => c && c.file instanceof File);
  // Check if validIdFile is present
  const hasValidId = formData.validIdFile instanceof File;
  const hasFiles = hasTrainingFiles || hasValidId;

  try {
    let res;

    if (hasFiles) {
      const fd = new FormData();
      // Clone formData and strip File objects for JSON payload; but keep metadata
      const formCopy = { ...formData, trainingCertificates: [], validIdFile: undefined };

      // For each certificate, if it has a file, append to FormData and reference field name
      (formData.trainingCertificates || []).forEach((c, idx) => {
        const trainingName = c.trainingName;
        const slug = String(trainingName).toLowerCase().replace(/[^a-z0-9]+/g, '-');
        if (c.file instanceof File) {
          const fieldName = `trainingFile:${slug}`;
          fd.append(fieldName, c.file, c.filename || c.file.name);
          formCopy.trainingCertificates.push({ trainingName, filename: c.filename || c.file.name, mime: c.mime || c.file.type, size: c.size || c.file.size, fileField: fieldName });
        } else if (c.s3Key) {
          // Already uploaded earlier (unlikely in memory-only flow) - include metadata so backend can validate
          formCopy.trainingCertificates.push({ trainingName, s3Key: c.s3Key, filename: c.filename, mime: c.mime, size: c.size });
        }
      });

      // Append Valid ID file if present
      if (hasValidId) {
        fd.append('validIdFile', formData.validIdFile, formData.validIdFile.name);
        formCopy.validIdFilename = formData.validIdFile.name;
        formCopy.validIdMimetype = formData.validIdFile.type;
        formCopy.validIdSize = formData.validIdFile.size;
      }

      fd.append('user', JSON.stringify(userData));
      fd.append('form', JSON.stringify(formCopy));

      res = await fetch(`${API_BASE}/applicants`, {
        method: "POST",
        body: fd,
        credentials: 'include',
      });
    } else {
      res = await fetch(`${API_BASE}/applicants`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user: userData,
          form: formData,
        }),
        credentials: 'include',
      });
    }

    // Parse response intelligently: prefer JSON, but fall back to text when needed
    const contentType = res.headers.get('content-type') || '';
    let data = null;

    if (contentType.includes('application/json')) {
      try {
        data = await res.json();
      } catch (e) {
        data = null;
      }
    } else {
      // try JSON first, then text
      try {
        data = await res.json();
      } catch (e) {
        try {
          const text = await res.text();
          data = text;
        } catch {
          data = null;
        }
      }
    }

    if (!res.ok) {
      const msg = (data && (data.error || data.message)) || (typeof data === 'string' && data) || `${res.status} ${res.statusText}` || "Failed to submit application";
      throw new Error(msg);
    }

    return data;
  } catch (err) {
    // Wrap network/fetch errors with useful message
    if (err instanceof Error && err.message) {
      throw new Error(`Failed to submit application: ${err.message}`);
    }
    throw new Error('Failed to submit application');
  }
}
