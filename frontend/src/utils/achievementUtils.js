export function computeProgressPercent(achievement = {}, userProgress = {}) {
  const current = Number(userProgress.current_count || 0);
  if (achievement.thresholds && typeof achievement.thresholds === 'object') {
    const thresholds = achievement.thresholds;
    const values = Object.values(thresholds).filter(v => typeof v === 'number' && Number.isFinite(v)).sort((a,b) => a-b);
    if (values.length === 0) return userProgress.earned ? 100 : 0;
    const next = values.find(v => current < v);
    if (next) return Math.min(100, Math.round((current / next) * 100));
    return userProgress.earned ? 100 : 0;
  }

  if (Number.isFinite(Number(achievement.threshold_value))) {
    const target = Number(achievement.threshold_value);
    if (target === 0) return userProgress.earned ? 100 : 0;
    return Math.min(100, Math.round((current / target) * 100));
  }

  return userProgress.earned ? 100 : 0;
}

export function selectBadgeUrl(achievement = {}, badgeLevel = 'single') {
  const map = achievement.badge_s3_url_map || achievement.badge_s3_urls || {};
  // prefer the exact level if present
  if (map && map[badgeLevel]) return map[badgeLevel];
  // fallback to 'single' or any first available
  if (map && map.single) return map.single;
  const first = Object.values(map || {}).find(Boolean);
  return first || null;
}
