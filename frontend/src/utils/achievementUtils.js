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

/**
 * Get the next tier the user is working toward and its threshold.
 * 
 * @param {Object} achievement - Achievement with thresholds
 * @param {number} currentCount - User's current action count
 * @returns {Object|null} { tier: 'bronze'|'silver'|'gold', threshold: number, label: string } or null if all earned
 */
export function getNextTierTarget(achievement = {}, currentCount = 0) {
  const thresholds = achievement.thresholds || {};
  const TIER_ORDER = ['bronze', 'silver', 'gold'];
  const TIER_LABELS = { bronze: 'Bronze', silver: 'Silver', gold: 'Gold' };
  
  for (const tier of TIER_ORDER) {
    const threshold = thresholds[tier];
    if (threshold && currentCount < threshold) {
      return { tier, threshold, label: TIER_LABELS[tier] };
    }
  }
  
  return null; // All tiers earned
}

/**
 * Compute progress percentage for sequential tier progression.
 * Shows progress toward the NEXT tier only (bronze → silver → gold).
 * 
 * @param {Object} achievement - Achievement with thresholds
 * @param {number} currentCount - User's current action count
 * @returns {number} Progress percentage (0-100) toward next tier
 */
export function computeSequentialProgress(achievement = {}, currentCount = 0) {
  const thresholds = achievement.thresholds || {};
  const TIER_ORDER = ['bronze', 'silver', 'gold'];
  
  // Convert currentCount to number to ensure proper comparison
  const count = Number(currentCount) || 0;
  
  // If all tiers earned, return 100%
  const goldThreshold = thresholds.gold;
  if (goldThreshold && count >= goldThreshold) {
    return 100;
  }
  
  // Find which tier we're working towards
  for (let i = 0; i < TIER_ORDER.length; i++) {
    const tier = TIER_ORDER[i];
    const threshold = Number(thresholds[tier]);
    
    // Skip if threshold is not a valid number
    if (!threshold || !Number.isFinite(threshold)) continue;
    
    // If we haven't reached this threshold, calculate progress toward it
    if (count < threshold) {
      // Get the previous tier's threshold (or 0 if this is bronze)
      const prevThreshold = i > 0 ? (Number(thresholds[TIER_ORDER[i - 1]]) || 0) : 0;
      const range = threshold - prevThreshold;
      
      // Avoid division by zero
      if (range <= 0) return 0;
      
      const progress = count - prevThreshold;
      
      return Math.min(100, Math.max(0, Math.round((progress / range) * 100)));
    }
  }
  
  return 100; // All tiers earned
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
