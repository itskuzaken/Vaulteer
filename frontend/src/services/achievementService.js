import { apiCall } from '../utils/apiUtils';
import { API_BASE } from '../config/config';

export async function fetchAchievements() {
  // Admin endpoint requires auth — use apiCall which attaches ID token and retries on 401
  const res = await apiCall(`${API_BASE}/gamification/admin/achievements`);
  return res.data || [];
}

export async function getAchievement(achievementId) {
  if (!achievementId) throw new Error('achievementId is required');
  const res = await apiCall(`${API_BASE}/gamification/admin/achievements/${achievementId}`);
  return res.data || null;
}

export async function createAchievement(payload = {}) {
  const res = await apiCall(`${API_BASE}/gamification/admin/achievements`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.data || null;
}

export async function updateAchievement(achievementId, updates = {}) {
  if (!achievementId) throw new Error('achievementId is required');
  const res = await apiCall(`${API_BASE}/gamification/admin/achievements/${achievementId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  return res.data || null;
}

export async function deleteAchievement(achievementId) {
  if (!achievementId) throw new Error('achievementId is required');
  await apiCall(`${API_BASE}/gamification/admin/achievements/${achievementId}`, { method: 'DELETE' });
  return true;
}

export async function presignBadgeUpload(achievementId, contentType = 'image/png', tier = 'single') {
  const res = await apiCall(`${API_BASE}/gamification/admin/achievements/${achievementId}/badge/presign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contentType, tier }),
  });
  return res.data || null;
}

export async function getBadgePreviewUrl(achievementId, tier = 'single') {
  if (!achievementId) throw new Error('achievementId is required');
  // Use authenticated apiCall to attach ID token — this endpoint is admin-protected
  const res = await apiCall(`${API_BASE}/gamification/admin/achievements/${achievementId}/badge/url?tier=${encodeURIComponent(tier)}`);
  return res.data || null;
}

export async function validateBadgeUpload(achievementId, s3Key, tier = 'single') {
  const res = await apiCall(`${API_BASE}/gamification/admin/achievements/${achievementId}/badge/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ s3Key, tier }),
  });
  return res.data || null;
}

// Server-side fallback upload (multipart/form-data) — use when presigned PUT fails (CORS) or not available
export async function uploadBadge(achievementId, file, tier = 'single') {
  if (!achievementId) throw new Error('achievementId is required');
  const form = new FormData();
  form.append('file', file);
  form.append('tier', tier);
  const res = await apiCall(`${API_BASE}/gamification/admin/achievements/${achievementId}/badge/upload`, {
    method: 'POST',
    body: form,
  });
  return res.data || null;
}

export async function confirmBadge(achievementId, s3Key, tier = 'single') {
  const res = await apiCall(`${API_BASE}/gamification/admin/achievements/${achievementId}/badge`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ s3Key, tier }),
  });
  return res.data || null;
}

export async function deleteBadge(achievementId, tier = 'single') {
  await apiCall(`${API_BASE}/gamification/admin/achievements/${achievementId}/badge?tier=${encodeURIComponent(tier)}`, { method: 'DELETE' });
  return true;
}

export async function updateAchievementThresholds(achievementId, thresholds) {
  if (!achievementId) throw new Error('achievementId is required');
  const res = await apiCall(`${API_BASE}/gamification/admin/achievements/${achievementId}/thresholds`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ thresholds })
  });
  return res.data || null;
}

const achievementService = { fetchAchievements };
export default achievementService;
