const express = require("express");
const router = express.Router();
const asyncHandler = require("../middleware/asyncHandler");
const authMiddleware = require("../middleware/auth");
const authenticate = authMiddleware.authenticate || ((req, res, next) => next());
const requireRole = authMiddleware.requireRole || ((roles) => (req, res, next) => next());
const gamificationService = require("../services/gamificationService");

// Level thresholds (admin)
router.get(
  "/level-thresholds",
  authenticate,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const thresholds = await gamificationService.getLevelThresholds();
    res.json({ success: true, data: thresholds });
  })
);

// Current user's level progress
router.get(
  "/level-progress",
  authenticate,
  asyncHandler(async (req, res) => {
    const progress = await gamificationService.getLevelProgress(req.currentUserId, req.authenticatedUser);
    res.json({ success: true, data: progress });
  })
);

router.get(
  "/summary",
  authenticate,
  asyncHandler(async (req, res) => {
    const data = await gamificationService.getSummary(req.currentUserId);
    res.json({ success: true, data });
  })
);

router.get(
  "/leaderboard",
  authenticate,
  asyncHandler(async (req, res) => {
    const period = (req.query.period || "all").toLowerCase();
    const limit = parseInt(req.query.limit, 10) || 20;
    const data = await gamificationService.getLeaderboard({ period, limit });
    res.json({ success: true, data });
  })
);

// Full view leaderboard (paginated, volunteer-only). Accessible to all authenticated roles
router.get(
  "/leaderboard/full",
  authenticate,
  asyncHandler(async (req, res) => {
    const period = (req.query.period || "all").toLowerCase();
    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit, 10) || 100));
    const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);
    const aroundUserId = req.query.aroundUserId ? parseInt(req.query.aroundUserId, 10) : null;

    const data = await gamificationService.getLeaderboardFull({ period, limit, offset, aroundUserId });
    res.json({ success: true, data });
  })
);

router.post(
  "/recalculate/:userId",
  authenticate,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const targetUserId = parseInt(req.params.userId, 10);

    if (Number.isNaN(targetUserId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user id",
      });
    }

    const data = await gamificationService.recalculateUser(targetUserId);
    res.json({
      success: true,
      message: "Gamification stats recalculated",
      data,
    });
  })
);

// Get achievements/progress for a user (self or admin)
router.get(
  "/users/:userId/achievements",
  authenticate,
  asyncHandler(async (req, res) => {
    const targetUserId = parseInt(req.params.userId, 10);
    if (Number.isNaN(targetUserId)) return res.status(400).json({ success: false, message: 'Invalid user id' });

    // Allow access if requesting own data or admin
    if (req.currentUserId !== targetUserId && req.currentUserRole !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const data = await gamificationService.getUserAchievements(targetUserId);
    res.json({ success: true, data });
  })
);

// Public (authenticated) achievements catalog (volunteer-facing)
router.get(
  "/achievements",
  authenticate,
  asyncHandler(async (req, res) => {
    const data = await gamificationService.listPublicAchievements();
    res.json({ success: true, data });
  })
);

// Merged catalog + user progress (self or admin) — returns progressPercent and badge_s3_url_map
router.get(
  "/users/:userId/achievements/full",
  authenticate,
  asyncHandler(async (req, res) => {
    const targetUserId = parseInt(req.params.userId, 10);
    if (Number.isNaN(targetUserId)) return res.status(400).json({ success: false, message: 'Invalid user id' });

    // Allow access if requesting own data or admin
    if (req.currentUserId !== targetUserId && req.currentUserRole !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    try {
      const data = await gamificationService.getUserAchievementsFull(targetUserId);
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, message: err?.message || 'Failed to fetch achievements' });
    }
  })
);

// Batch presign GET URLs for badge s3 keys (authenticated)
router.post(
  "/badges/presign",
  authenticate,
  asyncHandler(async (req, res) => {
    const badgeKeys = req.body?.badge_keys || req.query?.badge_keys || null;
    const keys = Array.isArray(badgeKeys) ? badgeKeys : (typeof badgeKeys === 'string' ? [badgeKeys] : []);
    if (!keys || keys.length === 0) return res.status(400).json({ success: false, message: 'badge_keys (array) is required' });

    try {
      const data = await gamificationService.presignBadgeGetUrls(keys);
      res.json({ success: true, data });
    } catch (err) {
      if (err && err.code === 'PRESIGNER_MISSING') return res.status(500).json({ success: false, message: err.message });
      res.status(500).json({ success: false, message: err?.message || 'Failed to presign badges' });
    }
  })
);

// Admin: list achievements (badge catalog)
router.get(
  "/admin/achievements",
  authenticate,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const data = await gamificationService.listAchievements();
    res.json({ success: true, data });
  })
);

// Admin: get single achievement
router.get(
  "/admin/achievements/:achievementId",
  authenticate,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const achievementId = parseInt(req.params.achievementId, 10);
    if (Number.isNaN(achievementId)) return res.status(400).json({ success: false, message: 'Invalid achievement id' });
    const data = await gamificationService.getAchievement(achievementId);
    res.json({ success: true, data });
  })
);

// Admin: create achievement
router.post(
  "/admin/achievements",
  authenticate,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    try {
      const data = await gamificationService.createAchievement(req.body || {}, req.authenticatedUser);
      res.json({ success: true, data });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  })
);

// Admin: update achievement
router.patch(
  "/admin/achievements/:achievementId",
  authenticate,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    try {
      const achievementId = parseInt(req.params.achievementId, 10);
      if (Number.isNaN(achievementId)) return res.status(400).json({ success: false, message: 'Invalid achievement id' });
      const data = await gamificationService.updateAchievement(achievementId, req.body || {}, req.authenticatedUser);
      res.json({ success: true, data });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  })
);

// Admin: delete achievement (soft)
router.delete(
  "/admin/achievements/:achievementId",
  authenticate,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const achievementId = parseInt(req.params.achievementId, 10);
    if (Number.isNaN(achievementId)) return res.status(400).json({ success: false, message: 'Invalid achievement id' });
    await gamificationService.deleteAchievement(achievementId, req.authenticatedUser);
    res.json({ success: true });
  })
);

// Admin: achievement audit
router.get(
  "/admin/achievements/:achievementId/audit",
  authenticate,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const achievementId = parseInt(req.params.achievementId, 10);
    if (Number.isNaN(achievementId)) return res.status(400).json({ success: false, message: 'Invalid achievement id' });
    const limit = parseInt(req.query.limit, 10) || 50;
    const data = await gamificationService.getAchievementAudit(achievementId, limit);
    res.json({ success: true, data });
  })
);


// Admin: list mappings
router.get(
  "/admin/achievement-mappings",
  authenticate,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const { eventType, triggerAction, targetRole } = req.query;
    const data = await gamificationService.listAchievementMappings({
      eventType: eventType || null,
      triggerAction: triggerAction || null,
      targetRole: targetRole || null,
    });
    res.json({ success: true, data });
  })
);

// Admin: create mapping
router.post(
  "/admin/achievement-mappings",
  authenticate,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const payload = req.body || {};
    try {
      const mapping = await gamificationService.createAchievementMapping(payload);
      res.json({ success: true, data: mapping });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  })
);

// Admin: update mapping
router.patch(
  "/admin/achievement-mappings/:mappingId",
  authenticate,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const mappingId = parseInt(req.params.mappingId, 10);
    if (Number.isNaN(mappingId)) return res.status(400).json({ success: false, message: 'Invalid mapping id' });
    try {
      const updated = await gamificationService.updateAchievementMapping(mappingId, req.body || {});
      res.json({ success: true, data: updated });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  })
);

// Admin: delete mapping
router.delete(
  "/admin/achievement-mappings/:mappingId",
  authenticate,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const mappingId = parseInt(req.params.mappingId, 10);
    if (Number.isNaN(mappingId)) return res.status(400).json({ success: false, message: 'Invalid mapping id' });
    const ok = await gamificationService.deleteAchievementMapping(mappingId);
    res.json({ success: ok, message: ok ? 'Mapping deleted' : 'Mapping not found' });
  })
);

// Admin: presign badge upload
router.post(
  "/admin/achievements/:achievementId/badge/presign",
  authenticate,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const achievementId = parseInt(req.params.achievementId, 10);
    if (Number.isNaN(achievementId)) return res.status(400).json({ success: false, message: 'Invalid achievement id' });
    const contentType = req.body?.contentType || req.query?.contentType || 'image/png';
    const tier = req.body?.tier || req.query?.tier || 'single';
    try {
      const data = await gamificationService.presignBadgeUpload(achievementId, contentType, tier);
      res.json({ success: true, data });
    } catch (err) {
      // If presigner not installed, return 500 (server misconfiguration)
      if (err && err.code === 'PRESIGNER_MISSING') {
        return res.status(500).json({ success: false, message: err.message });
      }
      res.status(400).json({ success: false, message: err.message });
    }
  })
);

// Admin: validate uploaded badge and attach it
router.post(
  "/admin/achievements/:achievementId/badge/validate",
  authenticate,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const achievementId = parseInt(req.params.achievementId, 10);
    if (Number.isNaN(achievementId)) return res.status(400).json({ success: false, message: 'Invalid achievement id' });
    const { s3Key, tier } = req.body || {};
    const chosenTier = tier || 'single';
    if (!s3Key) return res.status(400).json({ success: false, message: 's3Key required' });

    // Validation: size & dimensions
    const s3Service = require('../services/s3Service');
    const sharp = require('sharp');
    const maxBytes = Number(process.env.S3_BADGE_MAX_BYTES || 1024 * 1024); // 1MB default
    const minDim = Number(process.env.S3_BADGE_MIN_DIM || 64);
    const maxDim = Number(process.env.S3_BADGE_MAX_DIM || 2048);

    try {
      const buffer = await s3Service.downloadImage(s3Key);
      if (!buffer || !Buffer.isBuffer(buffer)) return res.status(400).json({ success: false, message: 'Failed to fetch S3 object' });
      if (buffer.byteLength > maxBytes) {
        // Delete invalid upload to avoid orphan
        await s3Service.deleteImage(s3Key).catch(() => {});
        return res.status(400).json({ success: false, message: 'File too large' });
      }

      const meta = await sharp(buffer).metadata();
      if (!meta || !meta.width || !meta.height) {
        await s3Service.deleteImage(s3Key).catch(() => {});
        return res.status(400).json({ success: false, message: 'Invalid image' });
      }

      if (meta.width < minDim || meta.height < minDim || meta.width > maxDim || meta.height > maxDim) {
        await s3Service.deleteImage(s3Key).catch(() => {});
        return res.status(400).json({ success: false, message: `Image dimensions must be between ${minDim} and ${maxDim}` });
      }

      // Save to DB and remove old badge (support per-tier)
      const row = await gamificationService.saveAchievementBadge(achievementId, s3Key, req.authenticatedUser, chosenTier);
      res.json({ success: true, data: row });
    } catch (err) {
      // Attempt to delete to avoid orphan
      try { await require('../services/s3Service').deleteImage(s3Key); } catch (e) {}
      res.status(400).json({ success: false, message: err && err.message ? err.message : 'Validation failed' });
    }
  })
);

// Admin: upload badge via server (multipart) — fallback for clients that cannot PUT to presigned URL (CORS)
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
router.post(
  "/admin/achievements/:achievementId/badge/upload",
  authenticate,
  requireRole("admin"),
  upload.single('file'),
  asyncHandler(async (req, res) => {
    const achievementId = parseInt(req.params.achievementId, 10);
    if (Number.isNaN(achievementId)) return res.status(400).json({ success: false, message: 'Invalid achievement id' });
    if (!req.file || !req.file.buffer) return res.status(400).json({ success: false, message: 'File is required' });

    const tier = req.body?.tier || 'single';
    const file = req.file;

    // Basic validations
    if (!file.mimetype || !file.mimetype.startsWith('image/')) return res.status(400).json({ success: false, message: 'Only image uploads are allowed' });
    const maxBytes = Number(process.env.S3_BADGE_MAX_BYTES || 1024 * 1024);
    if (file.size > maxBytes) return res.status(400).json({ success: false, message: 'File too large' });

    const sharp = require('sharp');
    let s3Key = null; // declare here so cleanup code can reference it safely
    try {
      const meta = await sharp(file.buffer).metadata();
      const minDim = Number(process.env.S3_BADGE_MIN_DIM || 64);
      const maxDim = Number(process.env.S3_BADGE_MAX_DIM || 2048);
      if (!meta || !meta.width || !meta.height) return res.status(400).json({ success: false, message: 'Invalid image' });
      if (meta.width < minDim || meta.height < minDim || meta.width > maxDim || meta.height > maxDim) return res.status(400).json({ success: false, message: `Image dimensions must be between ${minDim} and ${maxDim}` });

      // Compute deterministic S3 key (same logic as presign)
      const repo = require('../repositories/achievementRepository');
      let row = null;
      try { row = await repo.getAchievementById(achievementId); } catch (e) { row = null; }
      const badgeCode = row && row.badge_code ? row.badge_code : `achievement_${achievementId}`;
      const contentType = file.mimetype;
      const extension = contentType === 'image/svg+xml' ? 'svg' : contentType === 'image/jpeg' ? 'jpg' : 'png';
      s3Key = `achievement_badges/${badgeCode}/${tier}.${extension}`;

      // Upload to S3 server-side
      const s3Service = require('../services/s3Service');
      await s3Service.uploadBadgeBuffer(file.buffer, s3Key, contentType);

      // Save to DB (this will remove the old badge if necessary)
      const saved = await gamificationService.saveAchievementBadge(achievementId, s3Key, req.authenticatedUser, tier);
      res.json({ success: true, data: saved });
    } catch (err) {
      // Clean up any uploaded object (if we managed to upload one)
      try { if (s3Key) await require('../services/s3Service').deleteImage(s3Key); } catch (e) {}

      // If this is an AWS permission error, surface as 500 and provide actionable text
      const errMsg = err && err.message ? err.message : 'Upload failed';
      const isS3PermError = err && (err.code === 'AccessDenied' || err.code === 'NotAuthorized' || /not authorized to perform|AccessDenied|is not authorized/i.test(errMsg));
      if (isS3PermError) {
        console.error('[gamificationRoutes] S3 permission error during badge upload:', errMsg);
        return res.status(500).json({ success: false, message: `S3 permission error: ${errMsg}` });
      }

      res.status(400).json({ success: false, message: errMsg });
    }
  })
);

// Admin: confirm badge save
router.patch(
  "/admin/achievements/:achievementId/badge",
  authenticate,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const achievementId = parseInt(req.params.achievementId, 10);
    if (Number.isNaN(achievementId)) return res.status(400).json({ success: false, message: 'Invalid achievement id' });
    const { s3Key, tier } = req.body || {};
    const chosenTier = tier || 'single';
    if (!s3Key) return res.status(400).json({ success: false, message: 's3Key required' });
    let row = await gamificationService.saveAchievementBadge(achievementId, s3Key, null, chosenTier);
    if (!row) {
      // Fallback: fetch directly from DB if service didn't return row
      row = await require('../repositories/achievementRepository').getAchievementById(achievementId);
    }
    res.json({ success: true, data: row });
  })
);

// Admin: get presigned GET URL for badge preview
router.get(
  "/admin/achievements/:achievementId/badge/url",
  authenticate,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const achievementId = parseInt(req.params.achievementId, 10);
    if (Number.isNaN(achievementId)) return res.status(400).json({ success: false, message: 'Invalid achievement id' });
    const repo = require('../repositories/achievementRepository');
    const s3Service = require('../services/s3Service');

    const row = await repo.getAchievementById(achievementId);
    const requestedTier = req.query?.tier || 'single';
    let s3Key = null;
    if (row?.badge_s3_keys) {
      const keys = typeof row.badge_s3_keys === 'string' ? JSON.parse(row.badge_s3_keys) : row.badge_s3_keys;
      s3Key = keys && keys[requestedTier] ? keys[requestedTier] : (requestedTier === 'single' ? (row.badge_s3_key || row.achievement_icon) : null);
    } else {
      s3Key = row?.badge_s3_key || row?.achievement_icon || null;
    }

    if (!s3Key) return res.status(404).json({ success: false, message: 'No badge set for this achievement/tier' });

    try {
      const url = await s3Service.getPresignedDownloadUrl(s3Key);
      res.json({ success: true, data: { url, s3Key } });
    } catch (err) {
      res.status(500).json({ success: false, message: err?.message || 'Failed to create preview URL' });
    }
  })
);

// Admin: update thresholds for an achievement
router.patch(
  "/admin/achievements/:achievementId/thresholds",
  authenticate,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const achievementId = parseInt(req.params.achievementId, 10);
    if (Number.isNaN(achievementId)) return res.status(400).json({ success: false, message: 'Invalid achievement id' });

    const thresholds = req.body?.thresholds;
    if (!thresholds || typeof thresholds !== 'object') return res.status(400).json({ success: false, message: 'thresholds object required' });

    try {
      const row = await gamificationService.updateAchievementThresholds(achievementId, thresholds);
      res.json({ success: true, data: row });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  })
);

// Admin: delete badge
router.delete(
  "/admin/achievements/:achievementId/badge",
  authenticate,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const achievementId = parseInt(req.params.achievementId, 10);
    // If no tier is provided, treat as delete ALL tiers (legacy behaviour expected by tests)
    const tier = (Object.prototype.hasOwnProperty.call(req.query || {}, 'tier') || Object.prototype.hasOwnProperty.call(req.body || {}, 'tier')) ? (req.query?.tier || req.body?.tier || 'single') : null;
    if (Number.isNaN(achievementId)) return res.status(400).json({ success: false, message: 'Invalid achievement id' });
    await gamificationService.deleteAchievementBadge(achievementId, tier);
    res.json({ success: true });
  })
);

module.exports = router;
