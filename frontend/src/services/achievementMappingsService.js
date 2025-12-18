import { apiCall } from '../utils/apiUtils';
import { API_BASE } from '../config/config';

export async function fetchAchievementMappings({ eventType = null, triggerAction = null, targetRole = null } = {}) {
  const params = new URLSearchParams();
  if (eventType) params.set('eventType', eventType);
  if (triggerAction) params.set('triggerAction', triggerAction);
  if (targetRole) params.set('targetRole', targetRole);
  const url = `${API_BASE}/gamification/admin/achievement-mappings?${params.toString()}`;
  const res = await apiCall(url);
  return res.data || [];
}

export async function createAchievementMapping(payload) {
  const res = await apiCall(`${API_BASE}/gamification/admin/achievement-mappings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function updateAchievementMapping(mappingId, updates) {
  const res = await apiCall(`${API_BASE}/gamification/admin/achievement-mappings/${mappingId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  return res.data;
}

export async function deleteAchievementMapping(mappingId) {
  const res = await apiCall(`${API_BASE}/gamification/admin/achievement-mappings/${mappingId}`, {
    method: 'DELETE',
  });
  return res.success === true;
}
