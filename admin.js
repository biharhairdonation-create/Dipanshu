const express = require('express');
const Video = require('../models/Video');
const CreatorProfile = require('../models/CreatorProfile');
const { protect, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(protect, requireRole('admin'));

// GET /api/admin/pending-videos  (moderation queue)
router.get('/pending-videos', async (req, res) => {
  const videos = await Video.find({ moderationStatus: 'pending' }).populate('creator', 'displayName handle');
  res.json(videos);
});

// POST /api/admin/moderate-video/:videoId
router.post('/moderate-video/:videoId', async (req, res) => {
  const { decision } = req.body; // 'approved' or 'rejected'
  if (!['approved', 'rejected'].includes(decision)) {
    return res.status(400).json({ message: 'Decision must be approved or rejected.' });
  }
  const video = await Video.findById(req.params.videoId);
  if (!video) return res.status(404).json({ message: 'Video not found.' });

  video.moderationStatus = decision;
  await video.save();
  res.json({ message: `Video ${decision}.` });
});

// GET /api/admin/pending-creators
router.get('/pending-creators', async (req, res) => {
  const creators = await CreatorProfile.find({ isApproved: false }).select('displayName handle bio');
  res.json(creators);
});

// POST /api/admin/approve-creator/:profileId  (final gate before a creator profile is public)
router.post('/approve-creator/:profileId', async (req, res) => {
  const profile = await CreatorProfile.findById(req.params.profileId);
  if (!profile) return res.status(404).json({ message: 'Profile not found.' });

  profile.isApproved = true;
  await profile.save();
  res.json({ message: 'Creator approved and now public.' });
});

module.exports = router;
