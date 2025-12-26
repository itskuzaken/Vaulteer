import { API_BASE } from '../config/config';
import { apiCall } from '../utils/apiUtils';

export async function getCatalog() {
  return await apiCall(`${API_BASE}/gamification/achievements`);
}

export async function getUserAchievementsFull(userId) {
  return await apiCall(`${API_BASE}/gamification/users/${userId}/achievements/full`);
}

export async function presignBadgeUrls(badgeKeys = []) {
  if (!Array.isArray(badgeKeys)) throw new Error('badgeKeys must be an array');
  return await apiCall(`${API_BASE}/gamification/badges/presign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ badge_keys: badgeKeys }),
  });
}
