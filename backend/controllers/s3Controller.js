const s3Service = require('../services/s3Service');

function slugify(str) {
  return String(str)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

async function presignUpload(req, res) {
  try {
    const userId = req.currentUserId;
    const { fileName, contentType = 'application/pdf', purpose = 'volunteer-certificate', trainingName } = req.body;

    if (!fileName || !trainingName) {
      return res.status(400).json({ success: false, message: 'fileName and trainingName are required' });
    }

    // derive extension
    const extMatch = (fileName || '').match(/\.([a-zA-Z0-9]+)$/);
    const ext = extMatch ? extMatch[1].toLowerCase() : 'pdf';
    const timestamp = Date.now();
    const slug = slugify(trainingName);
    const s3Key = `vol-cert/${userId}/${timestamp}-${slug}.${ext}`;

    const uploadUrl = await s3Service.getPresignedUploadUrl(s3Key, contentType, 900); // 15 minutes

    res.json({ success: true, uploadUrl, s3Key });
  } catch (err) {
    console.error('Presign upload error:', err);
    if (err && err.code === 'PRESIGNER_MISSING') {
      return res.status(500).json({ success: false, message: 'Presigner not available on server' });
    }
    res.status(500).json({ success: false, message: 'Failed to generate presigned upload URL', error: err.message });
  }
}

module.exports = { presignUpload };
