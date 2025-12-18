const gamificationRepository = require('../repositories/gamificationRepository');

async function getLevelThresholds(req, res) {
  try {
    const thresholds = await gamificationRepository.getPointsThresholds();
    res.json({ success: true, thresholds });
  } catch (error) {
    console.error('[Gamification] Error fetching thresholds:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch thresholds' });
  }
}

async function getLevelProgress(req, res) {
  try {
    const userId = req.authenticatedUser.userId;
    const stats = await gamificationRepository.getUserLevelStats(userId);
    const thresholds = await gamificationRepository.getPointsThresholds();
    const next = thresholds.find(t => t.level === (stats.current_level || 1) + 1) || null;
    res.json({ success: true, progress: { current_level: stats.current_level, lifetime_points: stats.lifetime_points, total_points: stats.total_points, points_to_next_level: stats.points_to_next_level, next_level_rewards: next || null, eligibleForLeveling: (req.authenticatedUser.role === 'volunteer') } });
  } catch (error) {
    console.error('[Gamification] Error fetching level progress:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch level progress' });
  }
}

module.exports = {
  getLevelThresholds,
  getLevelProgress,
};